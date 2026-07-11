<?php

namespace App\Http\Controllers\Api\Gestionnaire;

use App\Http\Controllers\Controller;
use App\Jobs\SendAssistanceRecouvrementEmailJob;
use App\Models\AssistanceRequest;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * POST /api/gestionnaire/assistance-recouvrement (#179)
 * Persiste une demande d'assistance recouvrement + email à l'équipe IT.
 */
class AssistanceRecouvrementController extends Controller
{
    public function store(Request $request): JsonResponse
    {
        // Le front envoie en camelCase (cf. assistanceRecouvrement.service.ts).
        $validated = $request->validate([
            'contactName' => ['required', 'string', 'max:255'],
            'contactPhone' => ['required', 'string', 'max:30'],
            'contactEmail' => ['required', 'email', 'max:255'],
            'syndicName' => ['required', 'string', 'max:255'],
            'residencesCount' => ['nullable', 'string', 'max:50'],
            'impayesEstimate' => ['nullable', 'string', 'max:50'],
            'plan' => ['required', 'in:essentiel,complet,sur_mesure'],
            'message' => ['nullable', 'string', 'max:5000'],
        ]);

        $assistance = AssistanceRequest::create([
            'tenant_id' => config('app.tenant_id'),
            'reference' => $this->generateReference(),
            'contact_name' => $validated['contactName'],
            'contact_phone' => $validated['contactPhone'],
            'contact_email' => $validated['contactEmail'],
            'syndic_name' => $validated['syndicName'],
            'residences_count' => $validated['residencesCount'] ?? null,
            'impayes_estimate' => $validated['impayesEstimate'] ?? null,
            'plan' => $validated['plan'],
            'message' => $validated['message'] ?? null,
            'statut' => 'nouvelle',
            'created_by' => $request->user()?->id,
        ]);

        // Email à l'équipe IT — async (jamais dans le cycle requête, cf. CLAUDE.md).
        SendAssistanceRecouvrementEmailJob::dispatch($assistance->id);

        return response()->json([
            'status' => 'success',
            'data' => ['reference' => $assistance->reference],
        ], 201);
    }

    /** Référence lisible et unique, ex. AR-7F3K9Q (alphabet sans 0/O/1/I). */
    private function generateReference(): string
    {
        $alphabet = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

        do {
            $ref = 'AR-'.collect(range(1, 6))
                ->map(fn () => $alphabet[random_int(0, strlen($alphabet) - 1)])
                ->implode('');
        } while (AssistanceRequest::where('reference', $ref)->exists());

        return $ref;
    }
}
