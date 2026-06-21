<?php

namespace App\Http\Controllers\Api\Resident;

use App\Http\Controllers\Controller;
use App\Models\Visite;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Portail résident — déclaration de visiteurs attendus (KAN-102).
 * Le résident annonce un visiteur ; le backend génère un qr_token que
 * l'app affiche en QR. L'agent de sécurité le scanne à l'entrée.
 */
class PortailVisiteController extends Controller
{
    private function format(Visite $v): array
    {
        return [
            'id' => $v->id,
            'visiteur_nom' => $v->visiteur_nom,
            'motif' => $v->motif,
            'date_visite' => $v->date_visite?->toDateString(),
            'lot' => $v->lot_numero,
            'statut' => $v->statut,
            'qr_token' => $v->qr_token,
            'scanned_at' => $v->scanned_at?->toIso8601String(),
            'created_at' => $v->created_at?->toIso8601String(),
        ];
    }

    /** GET /api/portail/visites — visites déclarées par le résident (récentes d'abord). */
    public function index(Request $request): JsonResponse
    {
        $copro = $request->user()->coproprietaire;
        abort_if(! $copro, 422, 'Aucun lot n\'est associé à votre compte.');

        $visites = Visite::where('coproprietaire_id', $copro->id)
            ->orderByDesc('date_visite')->orderByDesc('id')
            ->get()
            ->map(fn ($v) => $this->format($v));

        return response()->json(['status' => 'success', 'data' => ['visites' => $visites]]);
    }

    /** POST /api/portail/visites — déclare un visiteur attendu. */
    public function store(Request $request): JsonResponse
    {
        $copro = $request->user()->coproprietaire;
        abort_if(! $copro, 422, 'Aucun lot n\'est associé à votre compte.');

        $data = $request->validate([
            'visiteur_nom' => ['required', 'string', 'max:255'],
            'motif' => ['nullable', 'string', 'max:255'],
            'date_visite' => ['nullable', 'date', 'after_or_equal:today'],
        ]);

        $lot = $copro->lot;
        $residence = $lot?->residence;
        abort_if(! $residence, 422, 'Résidence introuvable pour votre lot.');

        $visite = Visite::create([
            'tenant_id' => $residence->tenant_id,
            'residence_id' => $residence->id,
            'lot_id' => $lot->id,
            'coproprietaire_id' => $copro->id,
            'declarant_user_id' => $request->user()->id,
            'resident_nom' => $request->user()->name,
            'lot_numero' => $lot->numero,
            'visiteur_nom' => $data['visiteur_nom'],
            'motif' => $data['motif'] ?? null,
            'date_visite' => $data['date_visite'] ?? now()->toDateString(),
            'qr_token' => Visite::generateToken(),
            'statut' => 'attendu',
        ]);

        return response()->json([
            'status' => 'success',
            'message' => 'Visiteur déclaré. Présentez le QR à l\'entrée.',
            'data' => ['visite' => $this->format($visite)],
        ], 201);
    }

    /** DELETE /api/portail/visites/{id} — annule une visite non encore scannée. */
    public function destroy(Request $request, int $id): JsonResponse
    {
        $copro = $request->user()->coproprietaire;
        abort_if(! $copro, 422, 'Aucun lot n\'est associé à votre compte.');

        $visite = Visite::where('coproprietaire_id', $copro->id)->findOrFail($id);

        if ($visite->statut === 'scanne') {
            return response()->json([
                'status' => 'error',
                'message' => 'Ce visiteur est déjà entré : annulation impossible.',
            ], 409);
        }

        $visite->update(['statut' => 'annule']);

        return response()->json(['status' => 'success', 'message' => 'Visite annulée.']);
    }
}
