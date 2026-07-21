<?php

namespace App\Http\Controllers\Api\SuperAdmin;

use App\Http\Controllers\Controller;
use App\Models\Broadcast;
use App\Models\Notification;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Mail;
use Illuminate\Validation\Rule;

/**
 * Back-office Digitoyou — diffusions produit vers les cabinets (KAN-145).
 *
 * Compose un message ciblé (tous / par plan / par tenant) et le diffuse en
 * bannière in-app (Notification) + email. Historique + accusés de lecture.
 * Réservé au super_admin. Destinataires = comptes admin des cabinets
 * (manager / gestionnaire), jamais les résidents.
 */
class BroadcastController extends Controller
{
    private const ADMIN_ROLES = ['manager', 'gestionnaire'];

    /** GET /api/admin/broadcasts — historique (avec accusés de lecture). */
    public function index(): JsonResponse
    {
        $broadcasts = Broadcast::query()->orderByDesc('created_at')->limit(100)->get()
            ->map(fn (Broadcast $b) => $this->present($b));

        return response()->json(['status' => 'success', 'data' => $broadcasts]);
    }

    /** POST /api/admin/broadcasts — crée et diffuse (ou programme). */
    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'message' => ['required', 'string', 'max:5000'],
            'target' => ['required', Rule::in(['all', 'plan', 'tenant'])],
            'target_value' => ['nullable', 'string', 'max:255', Rule::requiredIf(fn () => in_array($request->target, ['plan', 'tenant']))],
            'channels' => ['required', 'array', 'min:1'],
            'channels.*' => [Rule::in(['app', 'email'])],
            'scheduled_at' => ['nullable', 'date'],
        ]);

        $broadcast = Broadcast::create([
            'title' => $data['title'],
            'message' => $data['message'],
            'target' => $data['target'],
            'target_value' => $data['target_value'] ?? null,
            'channels' => $data['channels'],
            'scheduled_at' => $data['scheduled_at'] ?? null,
            'created_by' => $request->user()->id,
        ]);

        // Diffusion immédiate si non programmée (ou programmée dans le passé).
        $isScheduledFuture = $broadcast->scheduled_at && $broadcast->scheduled_at->isFuture();
        if (! $isScheduledFuture) {
            $this->dispatchBroadcast($broadcast);
        }

        return response()->json([
            'status' => 'success',
            'message' => $isScheduledFuture ? 'Diffusion programmée.' : 'Diffusion envoyée.',
            'data' => $this->present($broadcast->fresh()),
        ], 201);
    }

    /** Résout les destinataires, crée les bannières in-app + emails, marque envoyé. */
    private function dispatchBroadcast(Broadcast $broadcast): void
    {
        $recipients = $this->resolveRecipients($broadcast);

        if (in_array('app', $broadcast->channels, true)) {
            foreach ($recipients as $user) {
                Notification::create([
                    'tenant_id' => $user->tenant_id,
                    'user_id' => $user->id,
                    'type' => 'info',
                    'title' => $broadcast->title,
                    'message' => $broadcast->message,
                    'read' => false,
                    'data' => ['broadcast_id' => $broadcast->id],
                ]);
            }
        }

        if (in_array('email', $broadcast->channels, true)) {
            foreach ($recipients as $user) {
                if (! $user->email) {
                    continue;
                }
                Mail::raw($broadcast->message, function ($mail) use ($user, $broadcast) {
                    $mail->to($user->email)->subject($broadcast->title);
                });
            }
        }

        $broadcast->update([
            'recipients_count' => $recipients->count(),
            'sent_at' => now(),
        ]);
    }

    /** @return Collection<int, User> */
    private function resolveRecipients(Broadcast $broadcast)
    {
        $tenantIds = match ($broadcast->target) {
            'tenant' => [$broadcast->target_value],
            'plan' => Tenant::where('plan', $broadcast->target_value)->pluck('id')->all(),
            default => Tenant::where('status', '!=', 'suspended')->pluck('id')->all(),
        };

        return User::whereIn('tenant_id', $tenantIds)
            ->whereIn('role', self::ADMIN_ROLES)
            ->where('status', 'active')
            ->get();
    }

    /** @return array<string, mixed> */
    private function present(Broadcast $b): array
    {
        $readCount = in_array('app', $b->channels, true)
            ? Notification::where('data->broadcast_id', $b->id)->where('read', true)->count()
            : 0;

        return [
            'id' => $b->id,
            'title' => $b->title,
            'message' => $b->message,
            'target' => $b->target,
            'target_value' => $b->target_value,
            'channels' => $b->channels,
            'scheduled_at' => $b->scheduled_at?->toIso8601String(),
            'sent_at' => $b->sent_at?->toIso8601String(),
            'recipients_count' => $b->recipients_count,
            'read_count' => $readCount,
            'created_at' => $b->created_at?->toIso8601String(),
        ];
    }
}
