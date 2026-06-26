<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Api\Gestionnaire\Concerns\AuthorizesResidence;
use App\Http\Controllers\Controller;
use App\Models\Residence;
use App\Services\Assistant\EmaroAssistantService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Assistant EMARO — chat IA (KAN-53). Les 4 questions clés (KAN-107) renvoient une
 * réponse figée + citation légale (déterministe, sans clé). Le free-form passe par
 * Claude si une clé est configurée, sinon un message d'aide.
 */
class IaChatController extends Controller
{
    use AuthorizesResidence;

    public function __construct(private readonly EmaroAssistantService $service) {}

    /** POST /api/ia/chat */
    public function chat(Request $request): JsonResponse
    {
        $data = $request->validate([
            'messages' => ['required', 'array', 'min:1'],
            'messages.*.role' => ['required', 'in:user,assistant'],
            'messages.*.content' => ['required', 'string'],
            'residence_id' => ['nullable', 'integer'],
            'language' => ['nullable', 'string', 'max:5'],
        ]);

        $residence = null;
        if (! empty($data['residence_id'])) {
            $residence = Residence::find($data['residence_id']);
            if ($residence) {
                $this->authorizeResidence($request, $residence);
            }
        }

        $lastUser = collect($data['messages'])->last(fn ($m) => $m['role'] === 'user');
        $question = $lastUser['content'] ?? '';

        // 1) Réponse figée pour les 4 sujets clés.
        if ($canned = $this->service->cannedReply($question, $residence)) {
            return $this->reply($canned['content'], $canned['citations']);
        }

        // 2) Free-form via Claude si configuré.
        if (config('services.anthropic.key') && ($content = $this->askClaude($data['messages'], $data['language'] ?? 'fr'))) {
            return $this->reply($content);
        }

        // 3) Repli sans clé / en cas d'erreur.
        return $this->reply($this->fallback());
    }

    private function reply(string $content, array $citations = []): JsonResponse
    {
        return response()->json([
            'status' => 'success',
            'data' => array_filter([
                'content' => $content,
                'citations' => $citations ?: null,
            ], fn ($v) => $v !== null),
        ]);
    }

    private function askClaude(array $messages, string $language): ?string
    {
        $system = "Tu es EMARO, l'assistant d'un logiciel de syndic de copropriété au Maroc (SyndikPro). "
            ."Réponds de façon concise, pratique et fiable, en langue « {$language} », en t'appuyant sur la "
            .'Loi 18-00 (statut de la copropriété) et le Décret 2.23.700 (règles comptables des syndicats). '
            .'Cite les articles quand c\'est pertinent. Si tu n\'es pas sûr, dis-le plutôt que d\'inventer.';

        try {
            $res = Http::withHeaders([
                'x-api-key' => config('services.anthropic.key'),
                'anthropic-version' => '2023-06-01',
            ])->timeout(30)->post('https://api.anthropic.com/v1/messages', [
                'model' => config('services.anthropic.model'),
                'max_tokens' => 1024,
                'system' => $system,
                'messages' => collect($messages)->map(fn ($m) => [
                    'role' => $m['role'],
                    'content' => $m['content'],
                ])->values()->all(),
            ]);

            if ($res->successful()) {
                return $res->json('content.0.text') ?: null;
            }
            Log::warning('EMARO chat: réponse Claude non OK', ['status' => $res->status()]);
        } catch (\Throwable $e) {
            Log::warning('EMARO chat: erreur Claude', ['error' => $e->getMessage()]);
        }

        return null;
    }

    private function fallback(): string
    {
        return "Je peux vous aider sur ces sujets clés du syndic :\n\n"
            ."- **Comment calculer les pénalités de retard ?**\n"
            ."- **Quelles annexes dois-je générer ?**\n"
            ."- **Quel est le délai légal de convocation d'une AG ?**\n"
            ."- **Comment clôturer l'exercice comptable ?**\n\n"
            .'Posez-moi l\'une de ces questions et je vous réponds en détail (Loi 18-00 / Décret 2.23.700).';
    }
}
