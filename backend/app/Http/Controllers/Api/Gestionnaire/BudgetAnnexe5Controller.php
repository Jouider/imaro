<?php

namespace App\Http\Controllers\Api\Gestionnaire;

use App\Http\Controllers\Controller;
use App\Models\Budget;
use App\Models\Exercice;
use App\Models\LigneBudget;
use App\Models\Residence;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class BudgetAnnexe5Controller extends Controller
{
    use Concerns\AuthorizesResidence;

    /**
     * GET /residences/{residence}/exercices/{exercice}/budget-annexe5
     */
    public function show(Request $request, Residence $residence, Exercice $exercice): JsonResponse
    {
        $this->authorizeResidence($request, $residence);
        abort_if($exercice->residence_id !== $residence->id, 404);

        $budget = Budget::with('lignes')
            ->where('residence_id', $residence->id)
            ->where('exercice_id', $exercice->id)
            ->first();

        if (! $budget) {
            return response()->json([
                'status' => 'success',
                'data'   => null,
            ]);
        }

        return response()->json([
            'status' => 'success',
            'data'   => $this->formatAnnexe5($budget, $residence, $exercice),
        ]);
    }

    /**
     * GET /residences/{residence}/exercices/{exercice}/budget
     * Simple budget format (used by getBudget in frontend)
     */
    public function showSimple(Request $request, Residence $residence, Exercice $exercice): JsonResponse
    {
        $this->authorizeResidence($request, $residence);
        abort_if($exercice->residence_id !== $residence->id, 404);

        $budget = Budget::with(['residence', 'exercice', 'postes.prestataire', 'postes.contrat'])
            ->where('residence_id', $residence->id)
            ->where('exercice_id', $exercice->id)
            ->first();

        if (! $budget) {
            return response()->json([
                'status' => 'success',
                'data'   => ['budget' => null],
            ]);
        }

        return response()->json([
            'status' => 'success',
            'data'   => ['budget' => new \App\Http\Resources\BudgetResource($budget)],
        ]);
    }

    /**
     * POST /budgets/{budget}/lignes
     */
    public function storeLigne(Request $request, Budget $budget): JsonResponse
    {
        abort_if($budget->tenant_id !== config('app.tenant_id'), 403);
        abort_if($budget->statut === 'verrouille', 422, 'Budget verrouillé, modification impossible.');

        $data = $request->validate([
            'compte_pcg' => 'required|string|max:10',
            'libelle'    => 'required|string|max:255',
            'type'       => ['required', Rule::in(['charge_courante', 'charge_travaux', 'produit_courant', 'produit_travaux'])],
            'realise_n1' => 'nullable|numeric|min:0',
            'budget_n'   => 'nullable|numeric|min:0',
            'engagement' => 'nullable|numeric|min:0',
            'realise'    => 'nullable|numeric|min:0',
            'ordre'      => 'nullable|integer|min:0',
        ]);

        $maxOrdre = $budget->lignes()->max('ordre') ?? 0;

        $ligne = $budget->lignes()->create([
            'compte_pcg' => $data['compte_pcg'],
            'libelle'    => $data['libelle'],
            'type'       => $data['type'],
            'realise_n1' => $data['realise_n1'] ?? 0,
            'budget_n'   => $data['budget_n'] ?? 0,
            'engagement' => $data['engagement'] ?? 0,
            'realise'    => $data['realise'] ?? 0,
            'ordre'      => $data['ordre'] ?? $maxOrdre + 1,
        ]);

        return response()->json([
            'status' => 'success',
            'data'   => $this->formatLigne($ligne),
        ], 201);
    }

    /**
     * PUT /budgets/lignes/{ligne}
     */
    public function updateLigne(Request $request, LigneBudget $ligne): JsonResponse
    {
        $budget = $ligne->budget;
        abort_if($budget->tenant_id !== config('app.tenant_id'), 403);
        abort_if($budget->statut === 'verrouille', 422, 'Budget verrouillé, modification impossible.');

        $data = $request->validate([
            'compte_pcg' => 'sometimes|string|max:10',
            'libelle'    => 'sometimes|string|max:255',
            'type'       => ['sometimes', Rule::in(['charge_courante', 'charge_travaux', 'produit_courant', 'produit_travaux'])],
            'realise_n1' => 'nullable|numeric|min:0',
            'budget_n'   => 'nullable|numeric|min:0',
            'engagement' => 'nullable|numeric|min:0',
            'realise'    => 'nullable|numeric|min:0',
            'ordre'      => 'nullable|integer|min:0',
        ]);

        $ligne->update($data);

        return response()->json([
            'status' => 'success',
            'data'   => $this->formatLigne($ligne->fresh()),
        ]);
    }

    /**
     * PUT /budgets/{budget}/lignes/bulk
     */
    public function bulkUpdateLignes(Request $request, Budget $budget): JsonResponse
    {
        abort_if($budget->tenant_id !== config('app.tenant_id'), 403);
        abort_if($budget->statut === 'verrouille', 422, 'Budget verrouillé, modification impossible.');

        $data = $request->validate([
            'lignes'            => 'required|array|min:1',
            'lignes.*.id'       => 'required|integer|exists:lignes_budget,id',
            'lignes.*.budget_n' => 'required|numeric|min:0',
        ]);

        $result = [];
        foreach ($data['lignes'] as $item) {
            $ligne = LigneBudget::where('id', $item['id'])
                ->where('budget_id', $budget->id)
                ->first();

            if ($ligne) {
                $ligne->update(['budget_n' => $item['budget_n']]);
                $result[] = $this->formatLigne($ligne->fresh());
            }
        }

        return response()->json([
            'status' => 'success',
            'data'   => $result,
        ]);
    }

    /**
     * DELETE /budgets/lignes/{ligne}
     */
    public function destroyLigne(LigneBudget $ligne): JsonResponse
    {
        $budget = $ligne->budget;
        abort_if($budget->tenant_id !== config('app.tenant_id'), 403);
        abort_if($budget->statut === 'verrouille', 422, 'Budget verrouillé, modification impossible.');

        $ligne->delete();

        return response()->json(['status' => 'success', 'message' => 'Ligne supprimée']);
    }

    /**
     * POST /budgets/{budget}/soumettre-ag
     */
    public function soumettreAg(Budget $budget): JsonResponse
    {
        abort_if($budget->tenant_id !== config('app.tenant_id'), 403);

        if ($budget->statut !== 'brouillon') {
            return response()->json([
                'status'  => 'error',
                'message' => 'Seul un budget en brouillon peut être soumis à l\'AG.',
            ], 422);
        }

        $budget->update(['statut' => 'soumis_ag']);
        $budget->load('lignes');

        return response()->json([
            'status' => 'success',
            'data'   => $this->formatAnnexe5($budget, $budget->residence, $budget->exercice),
        ]);
    }

    /**
     * POST /budgets/{budget}/verrouiller
     */
    public function verrouiller(Budget $budget): JsonResponse
    {
        abort_if($budget->tenant_id !== config('app.tenant_id'), 403);

        if (! in_array($budget->statut, ['approuve', 'soumis_ag'])) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Le budget doit être approuvé ou soumis à l\'AG avant d\'être verrouillé.',
            ], 422);
        }

        $budget->update(['statut' => 'verrouille']);
        $budget->load('lignes');

        return response()->json([
            'status' => 'success',
            'data'   => $this->formatAnnexe5($budget, $budget->residence, $budget->exercice),
        ]);
    }

    /**
     * GET /budgets/{budget}/simulation
     */
    public function simulation(Budget $budget): JsonResponse
    {
        abort_if($budget->tenant_id !== config('app.tenant_id'), 403);

        $budget->load('lignes');
        $residence = $budget->residence;

        $totalCharges = $budget->lignes
            ->whereIn('type', ['charge_courante', 'charge_travaux'])
            ->sum('budget_n');

        $lots = $residence->lots()->with('coproprietairePrincipal.user')->get();
        $totalTantieme = $lots->sum('tantieme') ?: 1000;

        $lotsSimulation = $lots->map(function ($lot) use ($totalCharges, $totalTantieme) {
            $pct = ($lot->tantieme / $totalTantieme) * 100;
            $cotisationAnnuelle = round(($lot->tantieme / $totalTantieme) * $totalCharges, 2);

            return [
                'lot_numero'           => $lot->numero,
                'coproprietaire_nom'   => $lot->coproprietairePrincipal?->user?->name ?? 'N/A',
                'tantieme'             => $lot->tantieme,
                'pct'                  => round($pct, 1),
                'cotisation_annuelle'  => $cotisationAnnuelle,
                'cotisation_mensuelle' => round($cotisationAnnuelle / 12, 2),
                'variation_vs_n1'      => 0, // TODO: compute from previous exercice
            ];
        });

        return response()->json([
            'status' => 'success',
            'data'   => [
                'budget_charges_total' => $totalCharges,
                'lots'                 => $lotsSimulation,
            ],
        ]);
    }

    /**
     * GET /budgets/{budget}/suggestions-ia
     * Returns static suggestions based on common Moroccan condo charges.
     */
    public function suggestionsIa(Budget $budget): JsonResponse
    {
        abort_if($budget->tenant_id !== config('app.tenant_id'), 403);

        // Static suggestions — will be replaced with real IA in future sprint
        $suggestions = [
            [
                'compte_pcg'      => '6111',
                'libelle'         => 'Gardiennage/Surveillance',
                'montant_suggere' => 44000,
                'montant_n1'      => 38000,
                'variation_pct'   => 15.8,
                'justification'   => 'Hausse du SMIG 2026 impactant le coût des agents de sécurité (+15%)',
            ],
            [
                'compte_pcg'      => '6131',
                'libelle'         => 'Maintenance ascenseur',
                'montant_suggere' => 33500,
                'montant_n1'      => 28000,
                'variation_pct'   => 19.6,
                'justification'   => 'Contrat renouvelé avec révision annuelle de 5% + visite réglementaire supplémentaire',
            ],
            [
                'compte_pcg'      => '6140',
                'libelle'         => 'Électricité parties communes',
                'montant_suggere' => 15000,
                'montant_n1'      => 12000,
                'variation_pct'   => 25.0,
                'justification'   => 'Révision des tarifs ONEE prévue au T2 2026 (+15%)',
            ],
            [
                'compte_pcg'      => '6161',
                'libelle'         => 'Assurances',
                'montant_suggere' => 23000,
                'montant_n1'      => 20000,
                'variation_pct'   => 15.0,
                'justification'   => 'Renouvellement police avec extension RCO et majoration indice BTP 2026',
            ],
            [
                'compte_pcg'      => '6171',
                'libelle'         => 'Nettoyage parties communes',
                'montant_suggere' => 18500,
                'montant_n1'      => 16000,
                'variation_pct'   => 15.6,
                'justification'   => 'Appel d\'offres 2026 — recommandation prestataire actuel + fréquence espaces verts',
            ],
        ];

        return response()->json([
            'status' => 'success',
            'data'   => $suggestions,
        ]);
    }

    // ─── Helpers ─────────────────────────────────────────────────────────────

    private function formatAnnexe5(Budget $budget, Residence $residence, Exercice $exercice): array
    {
        $lignes = $budget->lignes;

        $totalCharges = $lignes->whereIn('type', ['charge_courante', 'charge_travaux'])->sum('budget_n');
        $totalProduits = $lignes->whereIn('type', ['produit_courant', 'produit_travaux'])->sum('budget_n');

        return [
            'id'             => $budget->id,
            'exercice'       => [
                'id'     => $exercice->id,
                'annee'  => $exercice->annee,
                'statut' => $exercice->statut,
            ],
            'residence'      => [
                'id'   => $residence->id,
                'name' => $residence->name,
            ],
            'statut'         => $budget->statut,
            'version'        => $budget->version,
            'total_charges'  => (float) $totalCharges,
            'total_produits' => (float) $totalProduits,
            'resultat'       => (float) ($totalProduits - $totalCharges),
            'lignes'         => $lignes->map(fn ($l) => $this->formatLigne($l))->values()->all(),
        ];
    }

    private function formatLigne(LigneBudget $ligne): array
    {
        return [
            'id'            => $ligne->id,
            'budget_id'     => $ligne->budget_id,
            'compte_pcg'    => $ligne->compte_pcg,
            'libelle'       => $ligne->libelle,
            'type'          => $ligne->type,
            'realise_n1'    => (float) $ligne->realise_n1,
            'budget_n'      => (float) $ligne->budget_n,
            'engagement'    => (float) $ligne->engagement,
            'realise'       => (float) $ligne->realise,
            'pct_consomme'  => $ligne->pct_consomme,
            'ordre'         => $ligne->ordre,
        ];
    }
}
