<?php

namespace App\Http\Controllers\Api\Personnel;

use App\Http\Controllers\Controller;
use App\Models\PersonnelResidence;
use App\Models\Visite;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Agent de terrain (sécurité / gardien) — contrôle des visiteurs par QR (KAN-102).
 */
class PersonnelVisiteController extends Controller
{
    /** Résidences couvertes par l'agent connecté. */
    private function residenceIds(Request $request): array
    {
        return PersonnelResidence::where('user_id', $request->user()->id)
            ->pluck('residence_id')->all();
    }

    /**
     * POST /api/personnel/visites/scan — scanne le QR d'un visiteur.
     *
     *  - 404 : token inconnu
     *  - 409 : déjà scanné
     *  - 200 : { visite_id, resident_nom, lot, motif, statut: 'attendu'|'non_attendu' }
     *    'attendu'      → visiteur valide, entrée OK (marque la visite comme scannée)
     *    'non_attendu'  → token connu mais visite annulée ou périmée (ne marque rien)
     */
    public function scan(Request $request): JsonResponse
    {
        $data = $request->validate([
            'qr_token' => ['required', 'string'],
        ]);

        $visite = Visite::where('qr_token', $data['qr_token'])->first();
        abort_if(! $visite, 404, 'QR inconnu : aucun visiteur correspondant.');

        if ($visite->statut === 'scanne') {
            return response()->json([
                'status' => 'error',
                'message' => 'Ce QR a déjà été scanné.',
                'data' => [
                    'visite_id' => $visite->id,
                    'scanned_at' => $visite->scanned_at?->toIso8601String(),
                ],
            ], 409);
        }

        // Connu mais plus valable (annulé, ou date de visite dépassée) → non attendu.
        $perime = $visite->date_visite && $visite->date_visite->lt(now()->startOfDay());
        if ($visite->statut === 'annule' || $perime) {
            return response()->json([
                'status' => 'success',
                'data' => $this->verdict($visite, 'non_attendu'),
            ]);
        }

        $visite->update([
            'statut' => 'scanne',
            'scanned_at' => now(),
            'scanned_by' => $request->user()->id,
        ]);

        return response()->json([
            'status' => 'success',
            'data' => $this->verdict($visite, 'attendu'),
        ]);
    }

    /** GET /api/personnel/visites — visiteurs attendus aujourd'hui sur les résidences de l'agent. */
    public function index(Request $request): JsonResponse
    {
        $visites = Visite::whereIn('residence_id', $this->residenceIds($request))
            ->whereDate('date_visite', now()->toDateString())
            ->where('statut', '!=', 'annule')
            ->orderBy('statut')->orderBy('id')
            ->get()
            ->map(fn ($v) => [
                'visite_id' => $v->id,
                'resident_nom' => $v->resident_nom,
                'lot' => $v->lot_numero,
                'visiteur_nom' => $v->visiteur_nom,
                'motif' => $v->motif,
                'statut' => $v->statut,
                'scanned_at' => $v->scanned_at?->toIso8601String(),
            ]);

        return response()->json(['status' => 'success', 'data' => ['visites' => $visites]]);
    }

    private function verdict(Visite $v, string $statut): array
    {
        return [
            'visite_id' => $v->id,
            'resident_nom' => $v->resident_nom,
            'lot' => $v->lot_numero,
            'visiteur_nom' => $v->visiteur_nom,
            'motif' => $v->motif,
            'statut' => $statut,
        ];
    }
}
