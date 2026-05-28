<?php

namespace App\Http\Controllers\Api\Gestionnaire;

use App\Http\Controllers\Controller;
use App\Models\AppelFondsLigne;
use App\Models\Coproprietaire;
use Illuminate\Http\JsonResponse;

class DecompteController extends Controller
{
    /**
     * GET /api/gestionnaire/decomptes/{coproprietaireId}
     */
    public function show(int $coproprietaireId): JsonResponse
    {
        $copro = Coproprietaire::with(['user:id,name', 'lot:id,numero,tantieme'])
            ->findOrFail($coproprietaireId);

        $lignes = AppelFondsLigne::where('coproprietaire_id', $coproprietaireId)
            ->with('appelFonds:id,libelle,date_echeance,exercice_id')
            ->whereHas('appelFonds', fn ($q) => $q->where('statut', '!=', 'brouillon'))
            ->get();

        $totalAppele = $lignes->sum('montant_du');
        $totalPaye   = $lignes->sum('montant_paye');

        $detail = $lignes->map(fn ($l) => [
            'appel_fonds_titre' => $l->appelFonds?->libelle ?? '',
            'date_echeance'     => $l->appelFonds?->date_echeance?->toDateString(),
            'montant_du'        => round((float) $l->montant_du, 2),
            'montant_paye'      => round((float) $l->montant_paye, 2),
            'statut'            => $l->statut,
        ])->values();

        $exercice = $lignes->first()?->appelFonds;

        return response()->json([
            'status' => 'success',
            'data'   => [
                'coproprietaire_id'  => $copro->id,
                'coproprietaire_nom' => $copro->user?->name ?? '',
                'lot_numero'         => $copro->lot?->numero ?? '',
                'tantieme'           => $copro->lot?->tantieme ?? 0,
                'exercice_annee'     => $exercice?->exercice_id ? now()->year : now()->year,
                'total_appele'       => round((float) $totalAppele, 2),
                'total_paye'         => round((float) $totalPaye, 2),
                'solde'              => round((float) ($totalPaye - $totalAppele), 2),
                'detail'             => $detail,
            ],
        ]);
    }
}
