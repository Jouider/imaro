<?php

namespace App\Http\Controllers\Api\Gestionnaire;

use App\Http\Controllers\Controller;
use App\Models\AppelFondsLigne;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ImpayeController extends Controller
{
    /**
     * GET /api/gestionnaire/impayes
     * Liste des lignes impayées ou partielles sur les résidences du gestionnaire.
     */
    public function index(Request $request): JsonResponse
    {
        $query = AppelFondsLigne::with([
            'appelFonds.residence',
            'coproprietaire.user',
            'coproprietaire.lot',
        ])
            ->whereIn('statut', ['impaye', 'partiel'])
            ->whereHas(
                'appelFonds',
                function ($q) use ($request) {
                    $q->where('appels_fonds.statut', '!=', 'brouillon')
                        ->whereHas(
                            'residence',
                            fn ($r) => $r->where('gestionnaire_id', $request->user()->id)
                        );
                }
            );

        if ($request->filled('residence_id')) {
            $query->whereHas(
                'appelFonds',
                fn ($q) => $q->where('residence_id', $request->residence_id)
            );
        }

        if ($request->filled('appel_fonds_id')) {
            $query->where('appel_fonds_id', $request->appel_fonds_id);
        }

        if ($request->boolean('overdue_only')) {
            $query->whereHas(
                'appelFonds',
                fn ($q) => $q->where('date_echeance', '<', Carbon::today())
            );
        }

        $lignes = $query->get();

        $totalImpaye = $lignes->sum(fn ($l) => $l->montant_du - $l->montant_paye);

        $data = $lignes->map(function ($ligne) {
            $echeance = $ligne->appelFonds->date_echeance;
            $joursRetard = $echeance && $echeance->isPast()
                ? (int) $echeance->diffInDays(Carbon::today())
                : 0;

            return [
                'ligne_id' => $ligne->id,
                'montant_du' => $ligne->montant_du,
                'montant_paye' => $ligne->montant_paye,
                'montant_reste' => round($ligne->montant_du - $ligne->montant_paye, 2),
                'montant_restant' => round($ligne->montant_du - $ligne->montant_paye, 2),
                'statut' => $ligne->statut,
                'jours_retard' => $joursRetard,
                'appel_fonds' => [
                    'id' => $ligne->appelFonds->id,
                    'libelle' => $ligne->appelFonds->libelle,
                    'date_echeance' => $ligne->appelFonds->date_echeance?->toDateString(),
                ],
                'residence' => [
                    'id' => $ligne->appelFonds->residence->id,
                    'name' => $ligne->appelFonds->residence->name,
                ],
                'coproprietaire' => [
                    'id' => $ligne->coproprietaire->id,
                    'name' => $ligne->coproprietaire->user?->name,
                    'phone' => $ligne->coproprietaire->user?->phone,
                    'lot' => [
                        'numero' => $ligne->coproprietaire->lot?->numero,
                        'tantieme' => $ligne->coproprietaire->lot?->tantieme,
                    ],
                ],
            ];
        });

        return response()->json([
            'status' => 'success',
            'data' => [
                'impayes' => $data,
                'total_impaye' => round($totalImpaye, 2),
                'count' => $lignes->count(),
            ],
        ]);
    }
}
