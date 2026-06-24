<?php

namespace App\Http\Controllers\Api\Public;

use App\Http\Controllers\Controller;
use App\Models\Visite;
use Illuminate\Http\JsonResponse;

/**
 * Page publique du laissez-passer visiteur (/v/:token) — AUCUNE auth.
 * N'expose que les champs utiles au visiteur (cf. brief : pas d'id, residence_id,
 * phone ni created_by).
 */
class VisitePublicController extends Controller
{
    /** GET /api/public/visites/{token} */
    public function show(string $token): JsonResponse
    {
        $visite = Visite::withoutGlobalScope('tenant')
            ->with(['hostLot.coproprietairePrincipal.user', 'hostUser'])
            ->where('qr_token', $token)
            ->whereNotIn('status', ['cancelled', 'expired'])
            ->first();

        abort_if(! $visite, 404, 'Laissez-passer introuvable.');

        return response()->json([
            'status' => 'success',
            'data' => [
                'qr_token' => $visite->qr_token,
                'visitor_name' => $visite->visitor_name,
                'type' => $visite->type,
                'purpose' => $visite->purpose,
                'host_name' => $visite->hostUser?->name
                    ?? $visite->hostLot?->coproprietairePrincipal?->user?->name,
                'host_lot_numero' => $visite->hostLot?->numero,
                'planned_at' => $visite->planned_at?->toIso8601String(),
                'status' => $visite->status,
                'is_recurring' => (bool) $visite->is_recurring,
                'recurrence' => $visite->recurrence,
            ],
        ]);
    }

    /** GET /api/public/visites/{token}/wallet — non implémenté (le front masque les boutons sur 404). */
    public function wallet(string $token): JsonResponse
    {
        abort(404, 'Wallet non disponible.');
    }
}
