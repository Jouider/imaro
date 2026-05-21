<?php

namespace App\Http\Controllers\Api\Gestionnaire;

use App\Http\Controllers\Api\Gestionnaire\Concerns\AuthorizesResidence;
use App\Http\Controllers\Controller;
use App\Http\Requests\Gestionnaire\StoreLotRequest;
use App\Http\Requests\Gestionnaire\UpdateLotRequest;
use App\Http\Resources\LotResource;
use App\Models\Immeuble;
use App\Models\Lot;
use App\Models\Residence;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class LotController extends Controller
{
    use AuthorizesResidence;
    /**
     * GET /api/gestionnaire/residences/{residence}/lots
     */
    public function index(Request $request, Residence $residence): JsonResponse
    {
        $this->authorizeResidence($request, $residence);

        $lots = $residence->lots()
            ->with('coproprietairePrincipal.user')
            ->orderBy('numero')
            ->get();

        return response()->json([
            'status' => 'success',
            'data' => [
                'lots' => LotResource::collection($lots),
                'total_tantieme' => $residence->total_tantieme,
                'sum_tantieme' => round($lots->sum('tantieme'), 2),
            ],
        ]);
    }

    /**
     * POST /api/gestionnaire/residences/{residence}/lots
     */
    public function store(StoreLotRequest $request, Residence $residence): JsonResponse
    {
        $this->authorizeResidence($request, $residence);

        // Résoudre l'immeuble cible
        $immeubleId = $request->immeuble_id;
        $immeuble = Immeuble::where('id', $immeubleId)
            ->where('residence_id', $residence->id)
            ->firstOrFail();

        // Validation tantième uniquement en mode tantieme
        $newTantieme = $request->tantieme ?? 0;
        if ($residence->mode_cotisation === 'tantieme' && $newTantieme > 0) {
            $totalTantieme = $this->getTotalTantiemeScope($immeuble, $residence);
            $currentSum = $this->getCurrentTantiemeSum($immeuble, $residence);

            if ($currentSum + $newTantieme > $totalTantieme) {
                $remaining = $totalTantieme - $currentSum;
                return response()->json([
                    'status'  => 'error',
                    'message' => "Tantième invalide. Restant disponible : {$remaining}.",
                    'errors'  => ['tantieme' => ["La somme dépasserait {$totalTantieme}. Restant : {$remaining}."]],
                ], 422);
            }
        }

        $lot = Lot::create([
            'tenant_id'    => config('app.tenant_id'),
            'residence_id' => $residence->id,
            'immeuble_id'  => $immeuble->id,
            'numero'       => $request->numero,
            'type'         => $request->type,
            'etage'        => $request->etage ?? 0,
            'superficie'   => $request->superficie,
            'tantieme'     => $newTantieme,
        ]);

        $residence->increment('nb_lots');
        $immeuble->increment('nb_lots');

        $lot->load('coproprietairePrincipal.user', 'immeuble');

        return response()->json([
            'status'  => 'success',
            'message' => 'Lot créé',
            'data'    => ['lot' => new LotResource($lot)],
        ], 201);
    }

    /**
     * PUT /api/gestionnaire/residences/{residence}/lots/{lot}
     */
    public function update(UpdateLotRequest $request, Residence $residence, Lot $lot): JsonResponse
    {
        $this->authorizeResidence($request, $residence);
        abort_if($lot->residence_id !== $residence->id, 404);

        if ($request->has('tantieme')) {
            $currentSum = $residence->lots()->where('id', '!=', $lot->id)->sum('tantieme');
            $newTantieme = $request->tantieme;

            if ($currentSum + $newTantieme > $residence->total_tantieme) {
                $remaining = $residence->total_tantieme - $currentSum;

                return response()->json([
                    'status' => 'error',
                    'message' => "Tantième invalide. Restant disponible : {$remaining}.",
                    'errors' => ['tantieme' => ["La somme dépasserait {$residence->total_tantieme}. Restant : {$remaining}."]],
                ], 422);
            }
        }

        $lot->update($request->validated());
        $lot->load('coproprietairePrincipal.user');

        return response()->json([
            'status' => 'success',
            'message' => 'Lot mis à jour',
            'data' => ['lot' => new LotResource($lot)],
        ]);
    }

    /**
     * DELETE /api/gestionnaire/residences/{residence}/lots/{lot}
     */
    public function destroy(Request $request, Residence $residence, Lot $lot): JsonResponse
    {
        $this->authorizeResidence($request, $residence);
        abort_if($lot->residence_id !== $residence->id, 404);

        $hasUnpaid = $lot->coproprietaires()
            ->whereHas('appelsFondsLignes', fn ($q) => $q->where('statut', '!=', 'paye'))
            ->exists();

        if ($hasUnpaid) {
            return response()->json([
                'status' => 'error',
                'message' => 'Ce lot a des appels de fonds impayés. Réglez les impayés avant de supprimer.',
            ], 422);
        }

        $immeuble = $lot->immeuble;
        $lot->delete();
        $residence->decrement('nb_lots');
        $immeuble?->decrement('nb_lots');

        return response()->json([
            'status'  => 'success',
            'message' => 'Lot supprimé',
        ]);
    }

    /**
     * PUT /api/gestionnaire/lots/{lot}  — route plate attendue par le frontend
     */
    public function updateFlat(UpdateLotRequest $request, Lot $lot): JsonResponse
    {
        $residence = $lot->residence;
        $this->authorizeResidence($request, $residence);

        return $this->update($request, $residence, $lot);
    }

    /**
     * DELETE /api/gestionnaire/lots/{lot}  — route plate attendue par le frontend
     */
    public function destroyFlat(Request $request, Lot $lot): JsonResponse
    {
        $residence = $lot->residence;
        $this->authorizeResidence($request, $residence);

        return $this->destroy($request, $residence, $lot);
    }


    private function getTotalTantiemeScope(Immeuble $immeuble, Residence $residence): float
    {
        if ($immeuble->groupe_habitation_id && $immeuble->groupeHabitation) {
            return (float) $immeuble->groupeHabitation->total_tantieme;
        }
        return (float) $residence->total_tantieme;
    }

    private function getCurrentTantiemeSum(Immeuble $immeuble, Residence $residence): float
    {
        if ($immeuble->groupe_habitation_id) {
            return (float) Lot::whereHas('immeuble', function ($q) use ($immeuble) {
                $q->where('groupe_habitation_id', $immeuble->groupe_habitation_id);
            })->sum('tantieme');
        }
        return (float) $residence->lots()->sum('tantieme');
    }
}
