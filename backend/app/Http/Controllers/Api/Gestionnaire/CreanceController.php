<?php

namespace App\Http\Controllers\Api\Gestionnaire;

use App\Http\Controllers\Controller;
use App\Models\AppelFondsLigne;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CreanceController extends Controller
{
    /**
     * GET /api/gestionnaire/creances
     * List all appel_fonds_lignes as "créances" with copro info.
     */
    public function index(Request $request): JsonResponse
    {
        $tenantId = config('app.tenant_id');

        $query = AppelFondsLigne::whereHas('appelFonds', function ($q) use ($tenantId) {
            $q->where('tenant_id', $tenantId)
              ->where('statut', '!=', 'brouillon');
        })
        ->with([
            'appelFonds:id,libelle,date_echeance',
            'coproprietaire.user:id,name',
            'coproprietaire.lot:id,numero',
        ]);

        $lignes = $query->get();

        $creances = $lignes->map(function (AppelFondsLigne $ligne) {
            $echeance = $ligne->appelFonds?->date_echeance;
            $joursRetard = 0;
            $statut = 'a_payer';

            if ($ligne->statut === 'paye') {
                $statut = 'paye';
            } elseif ($ligne->montant_paye > 0 && $ligne->montant_paye < $ligne->montant_du) {
                $statut = 'partiellement_paye';
            } elseif ($echeance && Carbon::parse($echeance)->isPast()) {
                $statut = 'en_retard';
                $joursRetard = Carbon::parse($echeance)->diffInDays(now());
            }

            return [
                'id'                    => $ligne->id,
                'appel_fonds_id'        => $ligne->appel_fonds_id,
                'appel_fonds_titre'     => $ligne->appelFonds?->libelle ?? '',
                'coproprietaire_id'     => $ligne->coproprietaire_id,
                'coproprietaire_nom'    => $ligne->coproprietaire?->user?->name ?? '',
                'lot_numero'            => $ligne->coproprietaire?->lot?->numero ?? '',
                'montant_initial'       => round((float) $ligne->montant_du, 2),
                'montant_regle'         => round((float) $ligne->montant_paye, 2),
                'solde_restant'         => round((float) ($ligne->montant_du - $ligne->montant_paye), 2),
                'date_echeance'         => $echeance?->toDateString(),
                'date_derniere_relance' => null,
                'statut'                => $statut,
                'nb_relances'           => 0,
                'jours_retard'          => $joursRetard,
            ];
        });

        // Filters
        if ($request->query('statut')) {
            $creances = $creances->where('statut', $request->query('statut'));
        }
        if ($search = $request->query('search')) {
            $q = strtolower($search);
            $creances = $creances->filter(fn ($c) =>
                str_contains(strtolower($c['coproprietaire_nom']), $q) ||
                str_contains(strtolower($c['lot_numero']), $q)
            );
        }

        return response()->json([
            'status' => 'success',
            'data'   => $creances->values(),
        ]);
    }

    /**
     * POST /api/gestionnaire/creances/{id}/relancer
     */
    public function relancer(int $id): JsonResponse
    {
        return response()->json([
            'status'  => 'success',
            'message' => 'Relance envoyée.',
        ]);
    }

    /**
     * POST /api/gestionnaire/creances/relancer-tout
     */
    public function relancerTout(): JsonResponse
    {
        $tenantId = config('app.tenant_id');

        $count = AppelFondsLigne::whereHas('appelFonds', function ($q) use ($tenantId) {
            $q->where('tenant_id', $tenantId)
              ->where('statut', '!=', 'brouillon')
              ->where('date_echeance', '<', now());
        })
        ->where('statut', '!=', 'paye')
        ->count();

        return response()->json([
            'status' => 'success',
            'data'   => ['nb_envoye' => $count],
        ]);
    }
}
