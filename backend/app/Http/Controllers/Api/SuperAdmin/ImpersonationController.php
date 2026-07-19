<?php

namespace App\Http\Controllers\Api\SuperAdmin;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\ImpersonationSession;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Laravel\Sanctum\PersonalAccessToken;

/**
 * Back-office Digitoyou — historique des sessions de dépannage (KAN-147).
 *
 * Qui a dépanné quel cabinet, quand, pendant combien de temps — et permet de
 * couper une session en cours (révocation du token d'impersonation).
 * Réservé au super_admin ; la révocation est tracée dans l'audit (CNDP).
 */
class ImpersonationController extends Controller
{
    /** GET /api/admin/impersonations — historique (100 dernières). */
    public function index(): JsonResponse
    {
        $sessions = ImpersonationSession::query()
            ->with(['admin:id,name,email', 'tenant:id,name,subdomain', 'impersonatedUser:id,name,role'])
            ->orderByDesc('started_at')
            ->limit(100)
            ->get()
            ->map(fn (ImpersonationSession $s) => $this->present($s));

        return response()->json(['status' => 'success', 'data' => $sessions]);
    }

    /** POST /api/admin/impersonations/{session}/terminate — coupe la session. */
    public function terminate(Request $request, ImpersonationSession $session): JsonResponse
    {
        if (! $session->isActive()) {
            return response()->json([
                'status' => 'error',
                'message' => 'Cette session est déjà terminée ou expirée.',
            ], 422);
        }

        // Révoque le token d'impersonation → l'accès est coupé immédiatement.
        if ($session->token_id) {
            PersonalAccessToken::find($session->token_id)?->delete();
        }

        $session->update(['ended_at' => now(), 'ended_by' => $request->user()->id]);

        AuditLog::create([
            'tenant_id' => $session->tenant_id,
            'user_id' => $request->user()->id,
            'user_email' => $request->user()->email,
            'category' => 'auth',
            'action' => 'impersonation_end',
            'severity' => 'sensitive',
            'target_type' => 'Tenant',
            'target_id' => $session->tenant_id,
            'target_label' => $session->tenant?->name,
            'payload' => ['session_id' => $session->id, 'impersonated_user_id' => $session->impersonated_user_id],
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
            'created_at' => now(),
        ]);

        return response()->json([
            'status' => 'success',
            'message' => 'Session de dépannage terminée.',
            'data' => $this->present($session->fresh()->load(['admin:id,name,email', 'tenant:id,name,subdomain', 'impersonatedUser:id,name,role'])),
        ]);
    }

    /** @return array<string, mixed> */
    private function present(ImpersonationSession $s): array
    {
        // Durée réelle si terminée, sinon écoulée depuis le début.
        $end = $s->ended_at ?? ($s->expires_at && $s->expires_at->isPast() ? $s->expires_at : now());

        return [
            'id' => $s->id,
            'admin' => $s->admin ? ['id' => $s->admin->id, 'name' => $s->admin->name, 'email' => $s->admin->email] : null,
            'tenant' => $s->tenant ? ['id' => $s->tenant->id, 'name' => $s->tenant->name, 'subdomain' => $s->tenant->subdomain] : null,
            'impersonated_user' => $s->impersonatedUser
                ? ['id' => $s->impersonatedUser->id, 'name' => $s->impersonatedUser->name, 'role' => $s->impersonatedUser->role]
                : null,
            'started_at' => $s->started_at?->toIso8601String(),
            'expires_at' => $s->expires_at?->toIso8601String(),
            'ended_at' => $s->ended_at?->toIso8601String(),
            'duration_minutes' => $s->started_at ? (int) round($s->started_at->diffInSeconds($end) / 60) : null,
            'is_active' => $s->isActive(),
            'ip_address' => $s->ip_address,
        ];
    }
}
