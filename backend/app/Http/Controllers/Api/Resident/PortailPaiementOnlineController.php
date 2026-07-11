<?php

namespace App\Http\Controllers\Api\Resident;

use App\Http\Controllers\Controller;
use App\Models\PaymentSession;
use App\Services\Payment\PaymentGateway;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

/**
 * Paiement en ligne du portail résident (KAN-72 / #251).
 * Socle agnostique : le driver de passerelle est résolu via le conteneur
 * (lié seulement si services.payment.gateway est configuré).
 */
class PortailPaiementOnlineController extends Controller
{
    /**
     * POST /api/portail/paiement/initier
     * Body : { montant, reference? } → { payment_url, session_id }
     */
    public function initier(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'montant' => 'required|numeric|min:1',
            'reference' => 'nullable|string|max:255',
        ]);

        if (! app()->bound(PaymentGateway::class)) {
            return response()->json([
                'status' => 'error',
                'message' => 'Paiement en ligne non disponible (aucune passerelle configurée).',
            ], 422);
        }

        $user = $request->user();

        $session = PaymentSession::create([
            'session_id' => (string) Str::uuid(),
            'tenant_id' => $user->tenant_id,
            'user_id' => $user->id,
            'coproprietaire_id' => $user->coproprietaire?->id,
            'montant' => $validated['montant'],
            'reference' => $validated['reference'] ?? null,
            'gateway' => config('services.payment.gateway'),
            'statut' => 'pending',
        ]);

        $url = app(PaymentGateway::class)->createSession($session);
        $session->update(['payment_url' => $url]);

        return response()->json([
            'status' => 'success',
            'data' => ['payment_url' => $url, 'session_id' => $session->session_id],
        ]);
    }

    /**
     * GET /paiement/retour (public — appelé par la redirection de la passerelle).
     * Met à jour le statut puis rouvre l'app via deep-link.
     *
     * NB : confirmation NON autoritative (à compléter par un webhook signé propre
     * à la passerelle lors de l'implémentation du driver).
     */
    public function retour(Request $request): RedirectResponse
    {
        $sessionId = (string) $request->query('session_id', '');
        $statut = (string) $request->query('status', 'unknown');

        if ($sessionId !== '' && in_array($statut, ['success', 'cancel', 'failed'], true)) {
            PaymentSession::where('session_id', $sessionId)->update(['statut' => $statut]);
        }

        $appReturn = config('services.payment.app_return', 'imaro://paiement/retour');

        return redirect()->away($appReturn.'?status='.urlencode($statut).'&session_id='.urlencode($sessionId));
    }
}
