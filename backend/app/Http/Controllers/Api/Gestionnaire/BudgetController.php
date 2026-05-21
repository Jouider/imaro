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

        $budget = Budget::with(['residence', 'exercice', 'postes.prestataire', 'postes.contrat'])
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
        $tenantId = config('app.tenant_id');

        $data = $request->validate([
            'residence_id' => "required|exists:residences,id,tenant_id,{$tenantId}",
            'exercice_id'  => 'required|exists:exercices,id',
        ]);

        // Ensure exercice belongs to this residence
        $exerciceBelongsToResidence = \App\Models\Exercice::where('id', $data['exercice_id'])
            ->where('residence_id', $data['residence_id'])
            ->exists();

        if (! $exerciceBelongsToResidence) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Cet exercice n\'appartient pas à cette résidence.',
            ], 422);
        }

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

        $budget->load(['residence', 'exercice', 'postes.prestataire', 'postes.contrat']);

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
            'prestataire_id'  => 'nullable|exists:prestataires,id',
            'contrat_id'      => 'nullable|exists:contrats,id',
            'nombre'          => 'nullable|integer|min:1',
            'prix_unitaire'   => 'nullable|numeric|min:0',
            'cout_mensuel'    => 'nullable|numeric|min:0',
            'date_debut'      => 'nullable|date',
            'date_fin'        => 'nullable|date|after_or_equal:date_debut',
            'nb_mois'         => 'nullable|integer|min:1|max:12',
            'montant_prevu'   => 'nullable|numeric|min:0',
            'montant_realise' => 'nullable|numeric|min:0',
        ]);

        $computed = $this->computePoste($data);

        $poste = $budget->postes()->create($computed);
        $poste->load(['prestataire', 'contrat']);

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
            'prestataire_id'  => 'nullable|exists:prestataires,id',
            'contrat_id'      => 'nullable|exists:contrats,id',
            'nombre'          => 'nullable|integer|min:1',
            'prix_unitaire'   => 'nullable|numeric|min:0',
            'cout_mensuel'    => 'nullable|numeric|min:0',
            'date_debut'      => 'nullable|date',
            'date_fin'        => 'nullable|date|after_or_equal:date_debut',
            'nb_mois'         => 'nullable|integer|min:1|max:12',
            'montant_prevu'   => 'nullable|numeric|min:0',
            'montant_realise' => 'sometimes|numeric|min:0',
        ]);

        // Merge existing values with incoming for re-computation
        $merged = array_merge($poste->only([
            'nombre', 'prix_unitaire', 'cout_mensuel',
            'date_debut', 'date_fin', 'nb_mois', 'montant_prevu',
        ]), $data);

        $computed = $this->computePoste($merged);

        $poste->update($computed);
        $poste->load(['prestataire', 'contrat']);

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

    /**
     * Auto-calcule cout_mensuel, nb_mois et montant_prevu à partir des champs saisis.
     *
     * Priorités :
     *  1. cout_mensuel = nombre × prix_unitaire  (si les deux sont fournis)
     *  2. nb_mois      = diff(date_debut, date_fin) en mois  (si les deux dates sont fournies)
     *  3. montant_prevu = cout_mensuel × nb_mois
     */
    private function computePoste(array $data): array
    {
        // 1. cout_mensuel
        if (isset($data['nombre'], $data['prix_unitaire'])) {
            $data['cout_mensuel'] = round($data['nombre'] * $data['prix_unitaire'], 2);
        }

        // 2. nb_mois depuis les dates (si pas saisi manuellement)
        if (empty($data['nb_mois']) && ! empty($data['date_debut']) && ! empty($data['date_fin'])) {
            $debut = Carbon::parse($data['date_debut']);
            $fin   = Carbon::parse($data['date_fin']);
            // Inclure le mois de début et de fin
            $data['nb_mois'] = (int) max(1, $debut->diffInMonths($fin) + 1);
        }

        // 3. montant_prevu (si pas saisi manuellement)
        if (empty($data['montant_prevu']) && isset($data['cout_mensuel'], $data['nb_mois'])) {
            $data['montant_prevu'] = round($data['cout_mensuel'] * $data['nb_mois'], 2);
        }

        // Fallback : montant_prevu = cout_mensuel si nb_mois absent
        if (empty($data['montant_prevu']) && isset($data['cout_mensuel'])) {
            $data['montant_prevu'] = $data['cout_mensuel'];
        }

        $data['montant_realise'] = $data['montant_realise'] ?? 0;

        return $data;
    }
}
