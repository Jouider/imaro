<?php

namespace App\Http\Controllers\Api\Resident;

use App\Http\Controllers\Controller;
use App\Models\AppelFondsLigne;
use App\Models\Paiement;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

/**
 * GET /api/portail/operations
 * Contrat front : { operations: Operation[] } — un flux unifié appels + paiements.
 *   Operation = { id, type:'appel_fonds'|'paiement'|'penalite', libelle,
 *                 montant (négatif=débit/appel, positif=crédit/paiement),
 *                 date, statut:'paye'|'impaye'|'partiel'|'retard', recu_url? }
 */
class PortailOperationsController extends Controller
{
    public function __invoke(Request $request): JsonResponse
    {
        $copro = $request->user()->coproprietaire;
        if (! $copro) {
            return response()->json(['status' => 'success', 'data' => ['operations' => []]]);
        }

        $today = now()->startOfDay();

        // NB: pas de whereHas('appelFonds') — déclencherait le scope tenant d'AppelFonds.
        $appels = AppelFondsLigne::where('coproprietaire_id', $copro->id)
            ->with(['appelFonds' => fn ($q) => $q->withoutGlobalScope('tenant')])
            ->get()
            ->filter(fn ($l) => $l->appelFonds && $l->appelFonds->statut !== 'brouillon')
            ->map(function ($l) use ($today) {
                $echeance = $l->appelFonds?->date_echeance;
                $statut = $l->statut;   // impaye|partiel|paye
                if ($statut === 'impaye' && $echeance && $echeance->lt($today)) {
                    $statut = 'retard';
                }

                return [
                    'id' => $l->id,
                    'type' => 'appel_fonds',
                    'libelle' => $l->appelFonds?->libelle ?? 'Appel de fonds',
                    'montant' => -round((float) $l->montant_du, 2),   // débit
                    'date' => $echeance?->toDateString(),
                    'statut' => $statut,
                ];
            });

        $paiements = Paiement::where('coproprietaire_id', $copro->id)
            ->orderByDesc('date_paiement')->get()
            ->map(fn ($p) => [
                // décalage d'id pour éviter les collisions de clé React avec les lignes d'appel
                'id' => 1_000_000_000 + $p->id,
                'type' => 'paiement',
                'libelle' => 'Paiement'.($p->reference ? ' — '.$p->reference : ''),
                'montant' => round((float) $p->montant, 2),          // crédit
                'date' => $p->date_paiement?->toDateString(),
                'statut' => 'paye',
                'recu_url' => $p->recu_pdf_path ? Storage::disk('public')->url($p->recu_pdf_path) : null,
            ]);

        $operations = $appels->concat($paiements)->sortByDesc('date')->values();

        return response()->json([
            'status' => 'success',
            'data' => ['operations' => $operations],
        ]);
    }
}
