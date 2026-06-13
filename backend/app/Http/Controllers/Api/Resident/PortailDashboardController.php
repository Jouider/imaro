<?php

namespace App\Http\Controllers\Api\Resident;

use App\Http\Controllers\Controller;
use App\Models\AppelFondsLigne;
use App\Models\Paiement;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PortailDashboardController extends Controller
{
    public function __invoke(Request $request): JsonResponse
    {
        $copro = $request->user()->coproprietaire;

        if (! $copro) {
            return response()->json([
                'status' => 'success',
                'data'   => [
                    'solde' => 0, 'prochain_appel' => null,
                    'derniers_paiements' => [], 'annonces_non_lues' => 0, 'tickets_ouverts' => 0,
                ],
            ]);
        }

        // Pas de whereHas('appelFonds') (déclencherait le scope tenant d'AppelFonds,
        // pas toujours posé pour un résident) — on charge sans scope et filtre en PHP.
        $lignes = AppelFondsLigne::where('coproprietaire_id', $copro->id)
            ->with(['appelFonds' => fn ($q) => $q->withoutGlobalScope('tenant')])
            ->get()
            ->filter(fn ($l) => $l->appelFonds && $l->appelFonds->statut !== 'brouillon')
            ->values();

        $solde = $lignes->sum('montant_du') - $lignes->sum('montant_paye');
        $prochain = $lignes->filter(fn ($l) => $l->statut !== 'paye')
            ->sortBy(fn ($l) => $l->appelFonds?->date_echeance)->first();

        $paiements = Paiement::where('coproprietaire_id', $copro->id)
            ->orderByDesc('date_paiement')->limit(5)->get()
            ->map(fn ($p) => [
                'montant' => round((float) $p->montant, 2),
                'date_paiement' => $p->date_paiement?->toDateString(),
                'mode' => $p->mode,
            ]);

        return response()->json([
            'status' => 'success',
            'data'   => [
                'solde' => round((float) $solde, 2),
                'prochain_appel' => $prochain ? [
                    'titre' => $prochain->appelFonds?->libelle,
                    'montant_du' => round((float) $prochain->montant_du, 2),
                    'date_echeance' => $prochain->appelFonds?->date_echeance?->toDateString(),
                ] : null,
                'derniers_paiements' => $paiements,
                'annonces_non_lues' => 0,
                'tickets_ouverts' => 0,
            ],
        ]);
    }
}
