<?php

namespace App\Http\Controllers\Api\Gestionnaire;

use App\Http\Controllers\Controller;
use App\Http\Resources\BudgetResource;
use App\Http\Resources\PosteBudgetaireResource;
use App\Models\Budget;
use App\Models\PosteBudgetaire;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Validation\Rule;

class BudgetController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $request->validate([
            'residence_id' => 'required|exists:residences,id',
            'exercice_id'  => 'required|exists:exercices,id',
        ]);

        $budget = Budget::with(['residence', 'exercice', 'postes'])
            ->where('tenant_id', config('app.tenant_id'))
            ->where('residence_id', $request->residence_id)
            ->where('exercice_id', $request->exercice_id)
            ->first();

        return response()->json([
            'status' => 'success',
            'data'   => ['budget' => $budget ? new BudgetResource($budget) : null],
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'residence_id' => 'required|exists:residences,id',
            'exercice_id'  => 'required|exists:exercices,id',
        ]);

        if (Budget::where('residence_id', $data['residence_id'])->where('exercice_id', $data['exercice_id'])->exists()) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Un budget existe déjà pour cette résidence et cet exercice.',
            ], 422);
        }

        $budget = Budget::create([
            'tenant_id'    => config('app.tenant_id'),
            'residence_id' => $data['residence_id'],
            'exercice_id'  => $data['exercice_id'],
            'statut'       => 'brouillon',
        ]);

        $budget->load(['residence', 'exercice', 'postes']);

        return response()->json([
            'status'  => 'success',
            'message' => 'Budget créé',
            'data'    => ['budget' => new BudgetResource($budget)],
        ], 201);
    }

    public function approuver(Budget $budget): JsonResponse
    {
        abort_if($budget->tenant_id !== config('app.tenant_id'), 403);

        $budget->update([
            'statut'      => 'approuve',
            'approuve_at' => Carbon::now(),
        ]);

        $budget->load(['residence', 'exercice', 'postes']);

        return response()->json([
            'status'  => 'success',
            'message' => 'Budget approuvé',
            'data'    => ['budget' => new BudgetResource($budget)],
        ]);
    }

    public function storePoste(Request $request, Budget $budget): JsonResponse
    {
        abort_if($budget->tenant_id !== config('app.tenant_id'), 403);

        $data = $request->validate([
            'categorie'       => ['required', Rule::in(['entretien', 'gardiennage', 'nettoyage', 'administratif', 'travaux', 'assurance', 'autre'])],
            'description'     => 'required|string|max:255',
            'montant_prevu'   => 'required|numeric|min:0',
            'montant_realise' => 'nullable|numeric|min:0',
        ]);

        $poste = $budget->postes()->create([
            'categorie'       => $data['categorie'],
            'description'     => $data['description'],
            'montant_prevu'   => $data['montant_prevu'],
            'montant_realise' => $data['montant_realise'] ?? 0,
        ]);

        return response()->json([
            'status'  => 'success',
            'message' => 'Poste ajouté',
            'data'    => ['poste' => new PosteBudgetaireResource($poste)],
        ], 201);
    }

    public function updatePoste(Request $request, Budget $budget, PosteBudgetaire $poste): JsonResponse
    {
        abort_if($budget->tenant_id !== config('app.tenant_id'), 403);
        abort_if($poste->budget_id !== $budget->id, 404);

        $data = $request->validate([
            'categorie'       => ['sometimes', Rule::in(['entretien', 'gardiennage', 'nettoyage', 'administratif', 'travaux', 'assurance', 'autre'])],
            'description'     => 'sometimes|string|max:255',
            'montant_prevu'   => 'sometimes|numeric|min:0',
            'montant_realise' => 'sometimes|numeric|min:0',
        ]);

        $poste->update($data);

        return response()->json([
            'status'  => 'success',
            'message' => 'Poste mis à jour',
            'data'    => ['poste' => new PosteBudgetaireResource($poste)],
        ]);
    }

    public function destroyPoste(Budget $budget, PosteBudgetaire $poste): JsonResponse
    {
        abort_if($budget->tenant_id !== config('app.tenant_id'), 403);
        abort_if($poste->budget_id !== $budget->id, 404);

        $poste->delete();

        return response()->json(['status' => 'success', 'message' => 'Poste supprimé']);
    }
}
