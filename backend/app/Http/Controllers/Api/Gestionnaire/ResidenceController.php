<?php

namespace App\Http\Controllers\Api\Gestionnaire;

use App\Http\Controllers\Api\Gestionnaire\Concerns\AuthorizesResidence;
use App\Http\Controllers\Controller;
use App\Http\Requests\Gestionnaire\StoreResidenceRequest;
use App\Http\Requests\Gestionnaire\UpdateResidenceRequest;
use App\Http\Resources\ResidenceResource;
use App\Models\AppelFondsLigne;
use App\Models\Depense;
use App\Models\Paiement;
use App\Models\Residence;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ResidenceController extends Controller
{
    use AuthorizesResidence;

    /**
     * GET /api/gestionnaire/residences
     * Lists only residences assigned to the authenticated gestionnaire.
     */
    public function index(Request $request): JsonResponse
    {
        $query = Residence::when(
                ! $request->user()->hasRole('manager'),
                fn ($q) => $q->where('gestionnaire_id', $request->user()->id)
            )
            ->with(['gestionnaire', 'exercices'])
            ->withCount('lots');

        if ($search = $request->search) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('city', 'like', "%{$search}%");
            });
        }

        $residences = $query->paginate($request->integer('per_page', 15));

        return response()->json([
            'status' => 'success',
            'data' => [
                'residences' => ResidenceResource::collection($residences),
                'meta' => [
                    'total' => $residences->total(),
                    'per_page' => $residences->perPage(),
                    'current_page' => $residences->currentPage(),
                    'last_page' => $residences->lastPage(),
                ],
            ],
        ]);
    }

    /**
     * GET /api/gestionnaire/residences/{residence}
     */
    public function show(Request $request, Residence $residence): JsonResponse
    {
        $this->authorizeResidence($request, $residence);

        $residence->load(['gestionnaire', 'exercices', 'lots.coproprietairePrincipal.user']);

        return response()->json([
            'status' => 'success',
            'data' => new ResidenceResource($residence),
        ]);
    }

    /**
     * POST /api/gestionnaire/residences
     */
    public function store(StoreResidenceRequest $request): JsonResponse
    {
        $user = $request->user();

        $payload = array_merge($request->toModel(), [
            'tenant_id'       => $user->tenant_id,
            'gestionnaire_id' => $user->hasRole('gestionnaire') ? $user->id : null,
            'status'          => 'active',
            'total_tantieme'  => 1000,
            'nb_lots'         => 0,
        ]);

        $residence = Residence::create($payload);
        $residence->load('gestionnaire');

        return response()->json([
            'status'  => 'success',
            'message' => 'Résidence créée',
            'data'    => new ResidenceResource($residence),
        ], 201);
    }

    /**
     * PUT /api/gestionnaire/residences/{residence}
     */
    public function update(UpdateResidenceRequest $request, Residence $residence): JsonResponse
    {
        $this->authorizeResidence($request, $residence);

        $residence->update($request->toModel());

        return response()->json([
            'status'  => 'success',
            'message' => 'Résidence mise à jour',
            'data'    => new ResidenceResource($residence->fresh('gestionnaire')),
        ]);
    }

    /**
     * DELETE /api/gestionnaire/residences/{residence}
     * Soft-delete (cascades disabled — keeps history of lots / paiements).
     */
    public function destroy(Request $request, Residence $residence): JsonResponse
    {
        $this->authorizeResidence($request, $residence);

        $residence->delete();

        return response()->json([
            'status'  => 'success',
            'message' => 'Résidence supprimée',
            'data'    => ['id' => $residence->id],
        ]);
    }

    /**
     * GET /api/gestionnaire/residences/{residence}/overview
     * KPIs affichés dans l'espace de gestion.
     */
    public function overview(Request $request, Residence $residence): JsonResponse
    {
        $this->authorizeResidence($request, $residence);

        $nbLots = $residence->lots()->count();
        $nbCoproprietaires = $residence->coproprietaires()->distinct()->count('coproprietaires.id');

        // Lignes d'appels de fonds émis (non brouillon) pour cette résidence
        $lignesQuery = AppelFondsLigne::whereHas(
            'appelFonds',
            fn ($q) => $q->where('residence_id', $residence->id)->where('statut', '!=', 'brouillon')
        );

        $totalDu   = (clone $lignesQuery)->sum('montant_du');
        $totalPaye = (clone $lignesQuery)->sum('montant_paye');

        $tauxRecouvrement = $totalDu > 0
            ? round(($totalPaye / $totalDu) * 100, 1)
            : 0;

        // Payé sur le mois en cours (paiements liés à cette résidence)
        $debutMois = Carbon::now()->startOfMonth();
        $finMois   = Carbon::now()->endOfMonth();

        $payeCeMois = Paiement::whereHas(
                'appelFondsLigne.appelFonds',
                fn ($q) => $q->where('residence_id', $residence->id)
            )
            ->whereBetween('date_paiement', [$debutMois, $finMois])
            ->sum('montant');

        // Restant à recouvrer, ventilé en attente / retard via la date d'échéance
        $today = Carbon::today();

        $enAttente = (float) (clone $lignesQuery)
            ->where('statut', '!=', 'paye')
            ->whereHas('appelFonds', fn ($q) => $q->whereDate('date_echeance', '>=', $today))
            ->selectRaw('COALESCE(SUM(montant_du - montant_paye), 0) as total')
            ->value('total');

        $enRetard = (float) (clone $lignesQuery)
            ->where('statut', '!=', 'paye')
            ->whereHas('appelFonds', fn ($q) => $q->whereDate('date_echeance', '<', $today))
            ->selectRaw('COALESCE(SUM(montant_du - montant_paye), 0) as total')
            ->value('total');

        $nbImpayes = (clone $lignesQuery)
            ->where('statut', '!=', 'paye')
            ->whereHas('appelFonds', fn ($q) => $q->whereDate('date_echeance', '<', $today))
            ->count();

        // Trésorerie = total encaissé - total dépensé (toutes périodes confondues, résidence)
        $totalEncaisse = Paiement::whereHas(
            'appelFondsLigne.appelFonds',
            fn ($q) => $q->where('residence_id', $residence->id)
        )->sum('montant');

        $totalDepense = Depense::where('residence_id', $residence->id)
            ->where('statut', '!=', 'annule')
            ->sum('montant');

        $tresorerie = round((float) ($totalEncaisse - $totalDepense), 2);

        // Fonds de réserve — pas encore modélisé en sprint 2, on renvoie 0
        $fondsReserve = 0;

        return response()->json([
            'status' => 'success',
            'data'   => [
                'nb_lots'           => $nbLots,
                'nb_coproprietaires'=> $nbCoproprietaires,
                'taux_recouvrement' => $tauxRecouvrement,
                'paye_ce_mois'      => round((float) $payeCeMois, 2),
                'en_attente'        => round((float) $enAttente, 2),
                'en_retard'         => round((float) $enRetard, 2),
                'nb_impayes'        => $nbImpayes,
                'tresorerie'        => $tresorerie,
                'fonds_reserve'     => $fondsReserve,
            ],
        ]);
    }
}
