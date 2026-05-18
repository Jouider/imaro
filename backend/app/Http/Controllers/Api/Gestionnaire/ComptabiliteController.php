<?php

namespace App\Http\Controllers\Api\Gestionnaire;

use App\Http\Controllers\Controller;
use App\Http\Requests\Gestionnaire\StoreDepenseRequest;
use App\Http\Requests\Gestionnaire\StoreEncaissementRequest;
use App\Models\AppelFondsLigne;
use App\Models\Coproprietaire;
use App\Models\Depense;
use App\Models\Exercice;
use App\Models\Paiement;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ComptabiliteController extends Controller
{
    /**
     * GET /api/gestionnaire/exercices/{exercice}/dashboard
     */
    public function dashboard(Request $request, Exercice $exercice): JsonResponse
    {
        $this->authorizeExercice($request, $exercice);

        $residenceId = $exercice->residence_id;

        // Total charges (dépenses payées)
        $totalCharges = Depense::where('exercice_id', $exercice->id)
            ->where('statut', '!=', 'annule')
            ->sum('montant');

        // Total produits (paiements reçus)
        $totalProduits = Paiement::where('exercice_id', $exercice->id)->sum('montant');

        // Taux recouvrement
        $lignes = AppelFondsLigne::whereHas(
            'appelFonds',
            fn ($q) => $q->where('exercice_id', $exercice->id)->where('statut', '!=', 'brouillon')
        );
        $totalDu   = (clone $lignes)->sum('montant_du');
        $totalPaye = (clone $lignes)->sum('montant_paye');
        $tauxRecouvrement = $totalDu > 0 ? round(($totalPaye / $totalDu) * 100, 1) : 0;

        // Charges par catégorie
        $chargesParCategorie = Depense::where('exercice_id', $exercice->id)
            ->where('statut', '!=', 'annule')
            ->select('categorie', DB::raw('SUM(montant) as montant'))
            ->groupBy('categorie')
            ->get()
            ->map(fn ($d) => ['categorie' => $d->categorie, 'montant' => round((float) $d->montant, 2)]);

        // Évolution mensuelle
        $moisLabels = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];
        $chargesMensuelles = Depense::where('exercice_id', $exercice->id)
            ->where('statut', '!=', 'annule')
            ->select(DB::raw('MONTH(date) as mois'), DB::raw('SUM(montant) as total'))
            ->groupBy(DB::raw('MONTH(date)'))
            ->pluck('total', 'mois');

        $produitsMensuels = Paiement::where('exercice_id', $exercice->id)
            ->select(DB::raw('MONTH(date_paiement) as mois'), DB::raw('SUM(montant) as total'))
            ->groupBy(DB::raw('MONTH(date_paiement)'))
            ->pluck('total', 'mois');

        $evolutionMensuelle = [];
        for ($m = 1; $m <= 12; $m++) {
            if (isset($chargesMensuelles[$m]) || isset($produitsMensuels[$m])) {
                $evolutionMensuelle[] = [
                    'mois'     => $moisLabels[$m - 1],
                    'charges'  => round((float) ($chargesMensuelles[$m] ?? 0), 2),
                    'produits' => round((float) ($produitsMensuels[$m] ?? 0), 2),
                ];
            }
        }

        return response()->json([
            'status' => 'success',
            'data'   => [
                'dashboard' => [
                    'total_charges'         => round((float) $totalCharges, 2),
                    'total_produits'        => round((float) $totalProduits, 2),
                    'solde'                 => round((float) ($totalProduits - $totalCharges), 2),
                    'taux_recouvrement'     => $tauxRecouvrement,
                    'charges_par_categorie' => $chargesParCategorie,
                    'evolution_mensuelle'   => $evolutionMensuelle,
                ],
            ],
        ]);
    }

    /**
     * GET /api/gestionnaire/exercices/{exercice}/journal
     * Synthesize double-entry écritures from paiements + dépenses.
     */
    public function journal(Request $request, Exercice $exercice): JsonResponse
    {
        $this->authorizeExercice($request, $exercice);

        $ecritures = collect();

        // Paiements → debit 512 (Banque), credit 706 (Cotisations)
        $paiements = Paiement::where('exercice_id', $exercice->id)
            ->with('coproprietaire.user')
            ->orderBy('date_paiement')
            ->get();

        foreach ($paiements as $p) {
            $ecritures->push([
                'id'            => 'P'.$p->id,
                'date'          => $p->date_paiement->toDateString(),
                'libelle'       => 'Paiement '.$p->coproprietaire?->user?->name,
                'compte_debit'  => '512',
                'compte_credit' => '706',
                'montant'       => round($p->montant, 2),
                'piece'         => $p->reference ?? 'PAY-'.$p->id,
                'exercice_id'   => $exercice->id,
            ]);
        }

        // Dépenses → debit 6XX (Charges par catégorie), credit 401 (Fournisseurs) ou 512 (Banque si payé)
        $depenses = Depense::where('exercice_id', $exercice->id)
            ->where('statut', '!=', 'annule')
            ->orderBy('date')
            ->get();

        $categorieToCompte = [
            'Entretien'     => '614',
            'entretien'     => '614',
            'Gardiennage'   => '615',
            'gardiennage'   => '615',
            'Nettoyage'     => '616',
            'nettoyage'     => '616',
            'Assurance'     => '616',
            'assurance'     => '616',
            'Administratif' => '627',
            'administratif' => '627',
            'Travaux'       => '615',
            'travaux'       => '615',
            'Eau/Électricité' => '612',
        ];

        foreach ($depenses as $d) {
            $compteDebit  = $categorieToCompte[$d->categorie] ?? '618';
            $compteCredit = $d->statut === 'paye' ? '512' : '401';

            $ecritures->push([
                'id'            => 'D'.$d->id,
                'date'          => $d->date->toDateString(),
                'libelle'       => $d->description,
                'compte_debit'  => $compteDebit,
                'compte_credit' => $compteCredit,
                'montant'       => round($d->montant, 2),
                'piece'         => 'DEP-'.$d->id,
                'exercice_id'   => $exercice->id,
            ]);
        }

        // Apply filters
        if ($compte = $request->query('compte')) {
            $ecritures = $ecritures->filter(
                fn ($e) => $e['compte_debit'] === $compte || $e['compte_credit'] === $compte
            );
        }
        if ($type = $request->query('type')) {
            $ecritures = $ecritures->filter(fn ($e) => $type === 'debit'
                ? str_starts_with($e['id'], 'D')
                : str_starts_with($e['id'], 'P')
            );
        }

        return response()->json([
            'status' => 'success',
            'data'   => ['ecritures' => $ecritures->sortBy('date')->values()],
        ]);
    }

    /**
     * GET /api/gestionnaire/exercices/{exercice}/grand-livre
     */
    public function grandLivre(Request $request, Exercice $exercice): JsonResponse
    {
        $this->authorizeExercice($request, $exercice);

        // Re-use journal data to build grand livre
        $journalResponse = $this->journal($request, $exercice);
        $ecritures = json_decode($journalResponse->getContent(), true)['data']['ecritures'];

        $comptes = [];
        $comptesRef = $this->comptesReference();
        $comptesMap = collect($comptesRef)->keyBy('numero');

        foreach ($ecritures as $e) {
            foreach (['compte_debit', 'compte_credit'] as $side) {
                $numero = $e[$side];
                if (! isset($comptes[$numero])) {
                    $comptes[$numero] = [
                        'numero'        => $numero,
                        'intitule'      => $comptesMap[$numero]['intitule'] ?? 'Compte '.$numero,
                        'solde_initial' => 0,
                        'total_debit'   => 0,
                        'total_credit'  => 0,
                        'solde_final'   => 0,
                        'ecritures'     => [],
                    ];
                }

                $isDebit = $side === 'compte_debit';
                $comptes[$numero]['ecritures'][] = [
                    'date'    => $e['date'],
                    'libelle' => $e['libelle'],
                    'debit'   => $isDebit ? $e['montant'] : 0,
                    'credit'  => $isDebit ? 0 : $e['montant'],
                ];

                if ($isDebit) {
                    $comptes[$numero]['total_debit'] += $e['montant'];
                } else {
                    $comptes[$numero]['total_credit'] += $e['montant'];
                }
            }
        }

        foreach ($comptes as &$c) {
            $c['solde_final'] = round($c['total_debit'] - $c['total_credit'], 2);
            $c['total_debit']  = round($c['total_debit'], 2);
            $c['total_credit'] = round($c['total_credit'], 2);
        }

        $result = array_values($comptes);

        if ($compte = $request->query('compte')) {
            $result = array_values(array_filter($result, fn ($c) => $c['numero'] === $compte));
        }

        return response()->json([
            'status' => 'success',
            'data'   => ['comptes' => $result],
        ]);
    }

    /**
     * GET /api/gestionnaire/exercices/{exercice}/balance
     */
    public function balance(Request $request, Exercice $exercice): JsonResponse
    {
        $this->authorizeExercice($request, $exercice);

        $grandLivreResponse = $this->grandLivre($request, $exercice);
        $comptes = json_decode($grandLivreResponse->getContent(), true)['data']['comptes'];

        $balance = collect($comptes)->map(fn ($c) => [
            'compte'   => $c['numero'],
            'intitule' => $c['intitule'],
            'debit'    => $c['total_debit'],
            'credit'   => $c['total_credit'],
            'solde'    => $c['solde_final'],
        ])->values();

        return response()->json([
            'status' => 'success',
            'data'   => ['balance' => $balance],
        ]);
    }

    /**
     * GET /api/gestionnaire/exercices/{exercice}/depenses
     */
    public function depensesIndex(Request $request, Exercice $exercice): JsonResponse
    {
        $this->authorizeExercice($request, $exercice);

        $depenses = Depense::where('exercice_id', $exercice->id)
            ->with('prestataire')
            ->orderByDesc('date')
            ->get()
            ->map(fn (Depense $d) => [
                'id'          => $d->id,
                'date'        => $d->date->toDateString(),
                'description' => $d->description,
                'categorie'   => $d->categorie,
                'montant'     => round($d->montant, 2),
                'prestataire' => $d->prestataire?->name ?? $d->description,
                'statut'      => $d->statut,
                'exercice_id' => $d->exercice_id,
            ]);

        return response()->json([
            'status' => 'success',
            'data'   => ['depenses' => $depenses],
        ]);
    }

    /**
     * POST /api/gestionnaire/exercices/{exercice}/depenses
     */
    public function depensesStore(StoreDepenseRequest $request, Exercice $exercice): JsonResponse
    {
        $this->authorizeExercice($request, $exercice);
        abort_if($exercice->statut === 'cloture', 422, 'Exercice clôturé.');

        $depense = Depense::create([
            'tenant_id'      => $request->user()->tenant_id,
            'exercice_id'    => $exercice->id,
            'residence_id'   => $exercice->residence_id,
            'prestataire_id' => $request->prestataire_id,
            'created_by'     => $request->user()->id,
            'description'    => $request->description,
            'categorie'      => $request->categorie,
            'montant'        => $request->montant,
            'date'           => $request->date,
            'statut'         => $request->statut ?? 'en_attente',
        ]);

        return response()->json([
            'status'  => 'success',
            'message' => 'Dépense créée.',
            'data'    => [
                'depense' => [
                    'id'          => $depense->id,
                    'date'        => $depense->date->toDateString(),
                    'description' => $depense->description,
                    'categorie'   => $depense->categorie,
                    'montant'     => round($depense->montant, 2),
                    'prestataire' => $depense->prestataire?->name ?? $depense->description,
                    'statut'      => $depense->statut,
                    'exercice_id' => $depense->exercice_id,
                ],
            ],
        ], 201);
    }

    /**
     * DELETE /api/gestionnaire/exercices/{exercice}/depenses/{depense}
     */
    public function depensesDestroy(Request $request, Exercice $exercice, Depense $depense): JsonResponse
    {
        $this->authorizeExercice($request, $exercice);
        abort_if($exercice->statut === 'cloture', 422, 'Exercice clôturé.');
        abort_if($depense->exercice_id !== $exercice->id, 404);

        $depense->delete();

        return response()->json(['status' => 'success', 'message' => 'Dépense supprimée.']);
    }

    /**
     * POST /api/gestionnaire/exercices/{exercice}/encaissements
     */
    public function storeEncaissement(StoreEncaissementRequest $request, Exercice $exercice): JsonResponse
    {
        $this->authorizeExercice($request, $exercice);
        abort_if($exercice->statut === 'cloture', 422, 'Exercice clôturé.');

        $copro = Coproprietaire::findOrFail($request->coproprietaire_id);

        // Find the first unpaid ligne for this coproprietaire in this exercice
        $ligne = null;
        if ($request->appel_fonds_id) {
            $ligne = AppelFondsLigne::where('coproprietaire_id', $copro->id)
                ->whereHas('appelFonds', fn ($q) => $q->where('id', $request->appel_fonds_id))
                ->where('statut', '!=', 'paye')
                ->first();
        } else {
            $ligne = AppelFondsLigne::where('coproprietaire_id', $copro->id)
                ->whereHas('appelFonds', fn ($q) => $q->where('exercice_id', $exercice->id))
                ->where('statut', '!=', 'paye')
                ->first();
        }

        $paiement = DB::transaction(function () use ($request, $exercice, $copro, $ligne) {
            $paiement = Paiement::create([
                'tenant_id'             => $request->user()->tenant_id,
                'exercice_id'           => $exercice->id,
                'coproprietaire_id'     => $copro->id,
                'appel_fonds_ligne_id'  => $ligne?->id,
                'saisi_par'             => $request->user()->id,
                'montant'               => $request->montant,
                'mode'                  => 'virement',
                'reference'             => $request->reference,
                'date_paiement'         => $request->date,
            ]);

            if ($ligne) {
                $ligne->montant_paye = min($ligne->montant_du, $ligne->montant_paye + $request->montant);
                $ligne->statut       = $ligne->montant_paye >= $ligne->montant_du ? 'paye' : 'partiel';
                $ligne->save();
            }

            $copro->recalculerSolde();

            return $paiement;
        });

        return response()->json([
            'status'  => 'success',
            'message' => 'Encaissement enregistré.',
            'data'    => [
                'encaissement' => [
                    'id'                => $paiement->id,
                    'coproprietaire_id' => $paiement->coproprietaire_id,
                    'montant'           => round($paiement->montant, 2),
                    'date'              => $paiement->date_paiement->toDateString(),
                    'reference'         => $paiement->reference,
                ],
            ],
        ], 201);
    }

    /**
     * GET /api/gestionnaire/comptes-pcg
     * Static reference list of PCG accounts for syndicates.
     */
    public function comptesPcg(): JsonResponse
    {
        return response()->json([
            'status' => 'success',
            'data'   => ['comptes' => $this->comptesReference()],
        ]);
    }

    /**
     * POST /api/gestionnaire/exercices/{exercice}/cloturer
     */
    public function cloturer(Request $request, Exercice $exercice): JsonResponse
    {
        $this->authorizeExercice($request, $exercice);
        abort_if($exercice->statut === 'cloture', 422, 'Exercice déjà clôturé.');

        $exercice->update(['statut' => 'cloture']);

        return response()->json([
            'status' => 'success',
            'data'   => [
                'exercice' => [
                    'id'            => $exercice->id,
                    'annee'         => $exercice->annee,
                    'statut'        => 'cloture',
                    'date_cloture'  => now()->toDateString(),
                ],
            ],
        ]);
    }

    // ── Helpers ──────────────────────────────────────────────

    private function authorizeExercice(Request $request, Exercice $exercice): void
    {
        $residence = $exercice->residence;

        $isManager      = $request->user()->role === 'manager';
        $isGestionnaire = $residence->gestionnaire_id === $request->user()->id;

        abort_if(! $isManager && ! $isGestionnaire, 403, 'Accès refusé.');
    }

    private function comptesReference(): array
    {
        return [
            ['numero' => '401', 'intitule' => 'Fournisseurs', 'classe' => 4],
            ['numero' => '411', 'intitule' => 'Copropriétaires — cotisations à recevoir', 'classe' => 4],
            ['numero' => '512', 'intitule' => 'Banque', 'classe' => 5],
            ['numero' => '531', 'intitule' => 'Caisse', 'classe' => 5],
            ['numero' => '612', 'intitule' => 'Eau et électricité', 'classe' => 6],
            ['numero' => '614', 'intitule' => 'Charges d\'entretien et réparations', 'classe' => 6],
            ['numero' => '615', 'intitule' => 'Charges de gardiennage et sécurité', 'classe' => 6],
            ['numero' => '616', 'intitule' => 'Primes d\'assurance', 'classe' => 6],
            ['numero' => '618', 'intitule' => 'Autres charges de copropriété', 'classe' => 6],
            ['numero' => '627', 'intitule' => 'Frais de gestion et honoraires syndic', 'classe' => 6],
            ['numero' => '706', 'intitule' => 'Cotisations copropriétaires', 'classe' => 7],
            ['numero' => '708', 'intitule' => 'Produits des activités annexes', 'classe' => 7],
            ['numero' => '764', 'intitule' => 'Revenus des valeurs mobilières', 'classe' => 7],
        ];
    }
}
