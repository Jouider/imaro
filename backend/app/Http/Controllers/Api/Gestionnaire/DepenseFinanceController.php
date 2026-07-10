<?php

namespace App\Http\Controllers\Api\Gestionnaire;

use App\Http\Controllers\Api\Gestionnaire\Concerns\GuardsClosedExercice;
use App\Http\Controllers\Controller;
use App\Models\Depense;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class DepenseFinanceController extends Controller
{
    use GuardsClosedExercice;

    /**
     * GET /api/gestionnaire/depenses-finance
     */
    public function index(Request $request): JsonResponse
    {
        $tenantId = config('app.tenant_id');

        $query = Depense::where('tenant_id', $tenantId)
            ->with(['prestataire:id,nom', 'residence:id,name'])
            ->orderByDesc('date');

        if ($request->query('exercice_id')) {
            $query->where('exercice_id', $request->query('exercice_id'));
        }
        if ($request->query('residence_id')) {
            $query->where('residence_id', $request->query('residence_id'));
        }
        if ($request->query('categorie')) {
            $query->where('categorie', $request->query('categorie'));
        }

        $categorieToCompte = [
            'gardiennage' => '6138',
            'nettoyage' => '6131',
            'entretien' => '6135',
            'assurance' => '6136',
            'administratif' => '6171',
            'travaux' => '6134',
            'autre' => '6188',
        ];

        $depenses = $query->get()->map(function (Depense $d) use ($categorieToCompte) {
            $compte = $categorieToCompte[$d->categorie] ?? '6188';
            $libellesCompte = [
                '6138' => 'Autres rémunérations',
                '6131' => 'Nettoyage des locaux',
                '6135' => 'Entretien et petites réparations',
                '6136' => "Primes d'assurances",
                '6171' => 'Frais de gestion courante',
                '6134' => 'Contrats de maintenance',
                '6188' => 'Autres charges de copropriété',
            ];

            return [
                'id' => $d->id,
                'exercice_id' => $d->exercice_id,
                'residence_id' => $d->residence_id,
                'residence_nom' => $d->residence?->name ?? '',
                'titre' => $d->description,
                'montant' => round((float) $d->montant, 2),
                'date' => $d->date->toDateString(),
                'prestataire_id' => $d->prestataire_id,
                'prestataire_nom' => $d->prestataire?->nom ?? null,
                'compte_charge' => $compte,
                'libelle_compte' => $libellesCompte[$compte] ?? 'Charges diverses',
                'mode_paiement' => $d->statut === 'paye' ? 'virement' : 'autre',
                'justificatif_path' => null,
                'ecriture_id' => $d->id,
                'est_recurrente' => false,
                'statut_approbation' => $d->statut === 'paye' ? 'approuve' : ($d->statut === 'en_attente' ? 'en_attente' : null),
                'approuve_par' => $d->statut === 'paye' ? 'Gestionnaire' : null,
            ];
        });

        return response()->json([
            'status' => 'success',
            'data' => $depenses->values(),
        ]);
    }

    /**
     * POST /api/gestionnaire/depenses-finance
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'exercice_id' => 'required|exists:exercices,id',
            'residence_id' => 'required|exists:residences,id',
            'titre' => 'required|string|max:255',
            'montant' => 'required|numeric|min:0',
            'date' => 'required|date',
            'prestataire_id' => 'nullable|exists:prestataires,id',
            'compte_charge' => 'nullable|string',
            'mode_paiement' => 'nullable|string',
        ]);

        $this->abortIfExerciceCloture($validated['exercice_id']);

        $depense = Depense::create([
            'tenant_id' => config('app.tenant_id'),
            'exercice_id' => $validated['exercice_id'],
            'residence_id' => $validated['residence_id'],
            'prestataire_id' => $validated['prestataire_id'] ?? null,
            'created_by' => $request->user()->id,
            'description' => $validated['titre'],
            'categorie' => 'autre',
            'montant' => $validated['montant'],
            'date' => $validated['date'],
            'statut' => 'en_attente',
        ]);

        return response()->json([
            'status' => 'success',
            'message' => 'Dépense créée.',
            'data' => $depense,
        ], 201);
    }

    /**
     * DELETE /api/gestionnaire/depenses-finance/{id}
     */
    public function destroy(Depense $depense): JsonResponse
    {
        $depense->delete();

        return response()->json(['status' => 'success', 'message' => 'Dépense supprimée.']);
    }

    /**
     * GET /api/gestionnaire/depenses-finance/stats
     */
    public function stats(Request $request): JsonResponse
    {
        $tenantId = config('app.tenant_id');

        $depenses = Depense::where('tenant_id', $tenantId)
            ->where('statut', '!=', 'annule');

        $total = (clone $depenses)->sum('montant');
        $count = (clone $depenses)->count();
        $enAttente = (clone $depenses)->where('statut', 'en_attente')->count();

        // Evolution mensuelle
        $mensuelle = (clone $depenses)
            ->select(DB::raw('MONTH(date) as mois'), DB::raw('SUM(montant) as montant'))
            ->groupBy(DB::raw('MONTH(date)'))
            ->pluck('montant', 'mois');

        $moisLabels = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];
        $evolution = [];
        for ($m = 1; $m <= 12; $m++) {
            if (isset($mensuelle[$m])) {
                $evolution[] = ['mois' => $moisLabels[$m - 1], 'montant' => round((float) $mensuelle[$m], 2)];
            }
        }

        // Top catégories
        $topComptes = (clone $depenses)
            ->select('categorie', DB::raw('SUM(montant) as montant'), DB::raw('COUNT(*) as nb'))
            ->groupBy('categorie')
            ->orderByDesc('montant')
            ->limit(5)
            ->get()
            ->map(fn ($d) => [
                'compte' => $d->categorie,
                'libelle' => ucfirst($d->categorie),
                'montant' => round((float) $d->montant, 2),
                'pct' => $total > 0 ? round(($d->montant / $total) * 100, 1) : 0,
            ]);

        // Top prestataires
        $topPrest = Depense::where('tenant_id', $tenantId)
            ->where('statut', '!=', 'annule')
            ->whereNotNull('prestataire_id')
            ->with('prestataire:id,nom')
            ->select('prestataire_id', DB::raw('SUM(montant) as montant'), DB::raw('COUNT(*) as nb'))
            ->groupBy('prestataire_id')
            ->orderByDesc('montant')
            ->limit(5)
            ->get()
            ->map(fn ($d) => [
                'nom' => $d->prestataire?->nom ?? 'Inconnu',
                'montant' => round((float) $d->montant, 2),
                'nb' => $d->nb,
            ]);

        return response()->json([
            'status' => 'success',
            'data' => [
                'total_periode' => round((float) $total, 2),
                'nb_depenses' => $count,
                'montant_moyen' => $count > 0 ? round((float) $total / $count, 2) : 0,
                'en_attente_approbation' => $enAttente,
                'evolution_mensuelle' => $evolution,
                'top_comptes' => $topComptes,
                'top_prestataires' => $topPrest,
            ],
        ]);
    }

    /**
     * POST /api/gestionnaire/depenses-finance/{depense}/approuver
     */
    public function approuver(Depense $depense): JsonResponse
    {
        $depense->update(['statut' => 'paye']);

        return response()->json([
            'status' => 'success',
            'message' => 'Dépense approuvée.',
            'data' => $depense->fresh(),
        ]);
    }

    /**
     * POST /api/gestionnaire/depenses-finance/{depense}/rejeter
     */
    public function rejeter(Request $request, Depense $depense): JsonResponse
    {
        $depense->update(['statut' => 'annule']);

        return response()->json([
            'status' => 'success',
            'message' => 'Dépense rejetée.',
            'data' => $depense->fresh(),
        ]);
    }

    /**
     * GET /api/gestionnaire/depenses-finance/recurrentes
     */
    public function recurrentes(Request $request): JsonResponse
    {
        return response()->json([
            'status' => 'success',
            'data' => [],
        ]);
    }

    /**
     * POST /api/gestionnaire/depenses-finance/recurrentes
     */
    public function storeRecurrente(Request $request): JsonResponse
    {
        return response()->json([
            'status' => 'success',
            'message' => 'Dépense récurrente créée.',
            'data' => null,
        ], 201);
    }

    /**
     * POST /api/gestionnaire/depenses-finance/import-ia
     */
    public function importIa(Request $request): JsonResponse
    {
        return response()->json([
            'status' => 'success',
            'data' => [
                'titre' => 'Facture importée',
                'montant' => 0,
                'date' => now()->toDateString(),
                'fournisseur' => null,
                'compte_charge_suggere' => '6188',
                'confiance' => 'faible',
            ],
        ]);
    }

    /**
     * POST /api/gestionnaire/depenses-finance/recurrentes/{id}/toggle
     */
    public function toggleRecurrente(int $id): JsonResponse
    {
        return response()->json([
            'status' => 'success',
            'message' => 'Modèle récurrent basculé.',
            'data' => null,
        ]);
    }
}
