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

        $creances = $totalDu - $totalPaye;
        $tresorerie = round((float) ($totalProduits - $totalCharges), 2);

        return response()->json([
            'status' => 'success',
            'data'   => [
                'produits'               => round((float) $totalProduits, 2),
                'charges'                => round((float) $totalCharges, 2),
                'resultat'               => $tresorerie,
                'tresorerie'             => $tresorerie,
                'creances'               => round((float) $creances, 2),
                'taux_recouvrement'      => $tauxRecouvrement,
                'couverture_tresorerie'  => $totalCharges > 0 ? round($tresorerie / (float) $totalCharges * 100, 1) : 0,
                'banque_5121'            => $tresorerie,
                'cheque_5122'            => 0,
                'caisse_5161'            => 0,
                'evolution'              => $evolutionMensuelle,
                'charges_par_categorie'  => $chargesParCategorie->map(fn ($c) => [
                    'categorie' => ucfirst($c['categorie']),
                    'montant'   => $c['montant'],
                    'couleur'   => match ($c['categorie']) {
                        'gardiennage'   => '#3b82f6',
                        'nettoyage'     => '#10b981',
                        'entretien'     => '#f59e0b',
                        'assurance'     => '#8b5cf6',
                        'administratif' => '#ef4444',
                        'travaux'       => '#06b6d4',
                        default         => '#6b7280',
                    },
                ])->values(),
            ],
        ]);
    }

    /**
     * GET /api/gestionnaire/exercices/{exercice}/journal
     * Returns EcritureComptable[] matching frontend type.
     */
    public function journal(Request $request, Exercice $exercice): JsonResponse
    {
        $this->authorizeExercice($request, $exercice);

        $rawEntries = $this->buildRawJournalEntries($exercice);
        $comptesRef = collect($this->comptesReference())->keyBy('numero');

        // Split each compound entry into individual debit/credit lines
        $ecritures = collect();
        $seqId = 1;
        foreach ($rawEntries as $e) {
            $type = str_starts_with($e['id'], 'P') ? 'encaissement' : 'depense';

            // Debit line
            $ecritures->push([
                'id'                    => $seqId++,
                'exercice_id'           => $e['exercice_id'],
                'date'                  => $e['date'],
                'numero_compte'         => $e['compte_debit'],
                'libelle_compte'        => $comptesRef[$e['compte_debit']]['libelle'] ?? 'Compte '.$e['compte_debit'],
                'description'           => $e['libelle'],
                'debit'                 => $e['montant'],
                'credit'                => 0,
                'piece_justificative'   => $e['piece'],
                'type'                  => $type,
                'locked'                => false,
            ]);

            // Credit line
            $ecritures->push([
                'id'                    => $seqId++,
                'exercice_id'           => $e['exercice_id'],
                'date'                  => $e['date'],
                'numero_compte'         => $e['compte_credit'],
                'libelle_compte'        => $comptesRef[$e['compte_credit']]['libelle'] ?? 'Compte '.$e['compte_credit'],
                'description'           => $e['libelle'],
                'debit'                 => 0,
                'credit'                => $e['montant'],
                'piece_justificative'   => $e['piece'],
                'type'                  => $type,
                'locked'                => false,
            ]);
        }

        // Apply filters
        if ($search = $request->query('search')) {
            $q = strtolower($search);
            $ecritures = $ecritures->filter(fn ($e) =>
                str_contains(strtolower($e['description']), $q) ||
                str_contains($e['numero_compte'], $q)
            );
        }

        return response()->json([
            'status' => 'success',
            'data'   => $ecritures->sortBy('date')->values(),
        ]);
    }

    /**
     * Build raw compound journal entries (internal use for journal + grandLivre).
     */
    private function buildRawJournalEntries(Exercice $exercice): \Illuminate\Support\Collection
    {
        $entries = collect();

        $paiements = Paiement::where('exercice_id', $exercice->id)
            ->with('coproprietaire.user')
            ->orderBy('date_paiement')
            ->get();

        foreach ($paiements as $p) {
            $entries->push([
                'id'            => 'P'.$p->id,
                'date'          => $p->date_paiement->toDateString(),
                'libelle'       => 'Paiement '.$p->coproprietaire?->user?->name,
                'compte_debit'  => '5121',
                'compte_credit' => '7061',
                'montant'       => round($p->montant, 2),
                'piece'         => $p->reference ?? 'PAY-'.$p->id,
                'exercice_id'   => $exercice->id,
            ]);
        }

        $depenses = Depense::where('exercice_id', $exercice->id)
            ->where('statut', '!=', 'annule')
            ->orderBy('date')
            ->get();

        $categorieToCompte = [
            'entretien'     => '6135',
            'gardiennage'   => '6138',
            'nettoyage'     => '6131',
            'assurance'     => '6136',
            'administratif' => '6171',
            'travaux'       => '6134',
            'autre'         => '6188',
        ];

        foreach ($depenses as $d) {
            $compteDebit  = $categorieToCompte[strtolower($d->categorie)] ?? '6188';
            $compteCredit = $d->statut === 'paye' ? '5121' : '4011';

            $entries->push([
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

        return $entries;
    }

    /**
     * GET /api/gestionnaire/exercices/{exercice}/grand-livre
     */
    public function grandLivre(Request $request, Exercice $exercice, ?string $compte = null): JsonResponse
    {
        $this->authorizeExercice($request, $exercice);

        $rawEntries = $this->buildRawJournalEntries($exercice);
        $comptesRef = collect($this->comptesReference())->keyBy('numero');

        $comptes = [];
        $lineId = 1;

        foreach ($rawEntries as $e) {
            foreach (['compte_debit', 'compte_credit'] as $side) {
                $numero = $e[$side];
                if (! isset($comptes[$numero])) {
                    $comptes[$numero] = [
                        'numero'          => $numero,
                        'libelle'         => $comptesRef[$numero]['libelle'] ?? 'Compte '.$numero,
                        'solde_ouverture' => 0,
                        'total_debit'     => 0,
                        'total_credit'    => 0,
                        'solde_final'     => 0,
                        'lignes'          => [],
                    ];
                }

                $isDebit = $side === 'compte_debit';
                $runningDebit  = $comptes[$numero]['total_debit'] + ($isDebit ? $e['montant'] : 0);
                $runningCredit = $comptes[$numero]['total_credit'] + ($isDebit ? 0 : $e['montant']);

                $comptes[$numero]['lignes'][] = [
                    'id'          => $lineId++,
                    'date'        => $e['date'],
                    'description' => $e['libelle'],
                    'debit'       => $isDebit ? $e['montant'] : 0,
                    'credit'      => $isDebit ? 0 : $e['montant'],
                    'solde'       => round($runningDebit - $runningCredit, 2),
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

        // If a specific compte is requested via route param or query param
        $compteFilter = $compte ?? $request->query('compte');
        if ($compteFilter) {
            $match = $comptes[$compteFilter] ?? null;
            return response()->json([
                'status' => 'success',
                'data'   => $match ?? [
                    'numero'          => $compteFilter,
                    'libelle'         => $comptesRef[$compteFilter]['libelle'] ?? 'Compte '.$compteFilter,
                    'solde_ouverture' => 0,
                    'lignes'          => [],
                    'solde_final'     => 0,
                ],
            ]);
        }

        return response()->json([
            'status' => 'success',
            'data'   => array_values($comptes),
        ]);
    }

    /**
     * GET /api/gestionnaire/exercices/{exercice}/balance
     */
    public function balance(Request $request, Exercice $exercice): JsonResponse
    {
        $this->authorizeExercice($request, $exercice);

        $rawEntries = $this->buildRawJournalEntries($exercice);
        $comptesRef = collect($this->comptesReference())->keyBy('numero');

        $comptes = [];
        foreach ($rawEntries as $e) {
            foreach (['compte_debit', 'compte_credit'] as $side) {
                $numero = $e[$side];
                if (! isset($comptes[$numero])) {
                    $comptes[$numero] = ['debit' => 0, 'credit' => 0];
                }
                if ($side === 'compte_debit') {
                    $comptes[$numero]['debit'] += $e['montant'];
                } else {
                    $comptes[$numero]['credit'] += $e['montant'];
                }
            }
        }

        $balance = collect($comptes)->map(function ($totals, $numero) use ($comptesRef) {
            $ref = $comptesRef[$numero] ?? null;
            $solde = round($totals['debit'] - $totals['credit'], 2);
            return [
                'numero'          => $numero,
                'libelle'         => $ref['libelle'] ?? 'Compte '.$numero,
                'classe'          => $ref['classe'] ?? (int) substr($numero, 0, 1),
                'total_debit'     => round($totals['debit'], 2),
                'total_credit'    => round($totals['credit'], 2),
                'solde_debiteur'  => $solde > 0 ? $solde : 0,
                'solde_crediteur' => $solde < 0 ? abs($solde) : 0,
            ];
        })->sortBy('numero')->values();

        return response()->json([
            'status' => 'success',
            'data'   => $balance,
        ]);
    }

    /**
     * GET /api/gestionnaire/exercices/{exercice}/depenses
     */
    public function depensesIndex(Request $request, Exercice $exercice): JsonResponse
    {
        $this->authorizeExercice($request, $exercice);

        $categorieToCompte = [
            'gardiennage'   => '6138',
            'nettoyage'     => '6131',
            'entretien'     => '6135',
            'assurance'     => '6136',
            'administratif' => '6171',
            'travaux'       => '6134',
            'autre'         => '6188',
        ];
        $libellesCompte = [
            '6138' => 'Autres rémunérations',
            '6131' => 'Nettoyage des locaux',
            '6135' => 'Entretien et petites réparations',
            '6136' => "Primes d'assurances",
            '6171' => 'Frais de gestion courante',
            '6134' => 'Contrats de maintenance',
            '6188' => 'Autres charges de copropriété',
        ];

        $depenses = Depense::where('exercice_id', $exercice->id)
            ->with('prestataire:id,nom')
            ->orderByDesc('date')
            ->get()
            ->map(function (Depense $d) use ($categorieToCompte, $libellesCompte) {
                $compte = $categorieToCompte[$d->categorie] ?? '6188';
                return [
                    'id'                => $d->id,
                    'exercice_id'       => $d->exercice_id,
                    'titre'             => $d->description,
                    'montant'           => round((float) $d->montant, 2),
                    'date'              => $d->date->toDateString(),
                    'prestataire_id'    => $d->prestataire_id,
                    'prestataire_nom'   => $d->prestataire?->nom ?? null,
                    'compte_charge'     => $compte,
                    'libelle_compte'    => $libellesCompte[$compte] ?? 'Charges diverses',
                    'mode_paiement'     => $d->statut === 'paye' ? 'virement' : 'autre',
                    'justificatif_path' => null,
                    'ecriture_id'       => $d->id,
                ];
            });

        return response()->json([
            'status' => 'success',
            'data'   => $depenses,
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
            'data'   => $this->comptesReference(),
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

    /**
     * GET /api/gestionnaire/exercices/{exercice}/encaissements
     * (alias: /api/gestionnaire/comptabilite/exercices/{exercice}/encaissements)
     */
    public function encaissementsIndex(Request $request, Exercice $exercice): JsonResponse
    {
        $this->authorizeExercice($request, $exercice);

        $paiements = Paiement::where('exercice_id', $exercice->id)
            ->with(['coproprietaire.user:id,name', 'coproprietaire.lot:id,numero'])
            ->orderByDesc('date_paiement')
            ->get()
            ->map(fn (Paiement $p) => [
                'id'                => $p->id,
                'exercice_id'       => $p->exercice_id,
                'coproprietaire_id' => $p->coproprietaire_id,
                'coproprietaire_nom'=> $p->coproprietaire?->user?->name ?? '',
                'lot_numero'        => $p->coproprietaire?->lot?->numero ?? '',
                'montant'           => round($p->montant, 2),
                'date'              => $p->date_paiement?->toDateString(),
                'mode_paiement'     => $p->mode,
                'reference_cheque'  => $p->reference,
                'compte_destination'=> '5121',
                'ecriture_id'       => $p->id,
            ]);

        return response()->json([
            'status' => 'success',
            'data'   => $paiements,
        ]);
    }

    /**
     * POST /api/gestionnaire/comptabilite/exercices/{exercice}/import-ia
     */
    public function importIa(Request $request, Exercice $exercice): JsonResponse
    {
        $this->authorizeExercice($request, $exercice);

        return response()->json([
            'status' => 'success',
            'data'   => [
                'titre'                 => 'Facture importée',
                'montant'               => 0,
                'date'                  => now()->toDateString(),
                'fournisseur'           => null,
                'compte_charge_suggere' => '6188',
                'confiance'             => 'faible',
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
        $comptes = [
            ['numero' => '1200', 'libelle' => 'Résultat de l\'exercice', 'classe' => 1, 'type' => 'capitaux', 'nature' => 'both'],
            ['numero' => '1400', 'libelle' => 'Fonds de roulement', 'classe' => 1, 'type' => 'capitaux', 'nature' => 'both'],
            ['numero' => '1500', 'libelle' => 'Provisions pour charges', 'classe' => 1, 'type' => 'capitaux', 'nature' => 'both'],
            ['numero' => '3421', 'libelle' => 'Avances et acomptes versés', 'classe' => 3, 'type' => 'actif', 'nature' => 'courant'],
            ['numero' => '4011', 'libelle' => 'Fournisseurs', 'classe' => 4, 'type' => 'passif', 'nature' => 'courant', 'utilisable_depense' => true],
            ['numero' => '4111', 'libelle' => 'Copropriétaires — cotisations à recevoir', 'classe' => 4, 'type' => 'actif', 'nature' => 'courant'],
            ['numero' => '4417', 'libelle' => 'État — impôts et taxes', 'classe' => 4, 'type' => 'passif', 'nature' => 'courant'],
            ['numero' => '5121', 'libelle' => 'Banque', 'classe' => 5, 'type' => 'tresorerie', 'nature' => 'courant'],
            ['numero' => '5161', 'libelle' => 'Caisse', 'classe' => 5, 'type' => 'tresorerie', 'nature' => 'courant'],
            ['numero' => '6121', 'libelle' => 'Eau et électricité', 'classe' => 6, 'type' => 'charge', 'nature' => 'courant', 'utilisable_depense' => true, 'utilisable_budget' => true],
            ['numero' => '6131', 'libelle' => 'Nettoyage des locaux', 'classe' => 6, 'type' => 'charge', 'nature' => 'courant', 'utilisable_depense' => true, 'utilisable_budget' => true],
            ['numero' => '6134', 'libelle' => 'Contrats de maintenance', 'classe' => 6, 'type' => 'charge', 'nature' => 'courant', 'utilisable_depense' => true, 'utilisable_budget' => true],
            ['numero' => '6135', 'libelle' => 'Entretien et petites réparations', 'classe' => 6, 'type' => 'charge', 'nature' => 'courant', 'utilisable_depense' => true, 'utilisable_budget' => true],
            ['numero' => '6136', 'libelle' => 'Primes d\'assurances', 'classe' => 6, 'type' => 'charge', 'nature' => 'courant', 'utilisable_depense' => true, 'utilisable_budget' => true],
            ['numero' => '6138', 'libelle' => 'Autres rémunérations (gardiennage)', 'classe' => 6, 'type' => 'charge', 'nature' => 'courant', 'utilisable_depense' => true, 'utilisable_budget' => true],
            ['numero' => '6141', 'libelle' => 'Charges de gardiennage et sécurité', 'classe' => 6, 'type' => 'charge', 'nature' => 'courant', 'utilisable_depense' => true, 'utilisable_budget' => true],
            ['numero' => '6171', 'libelle' => 'Frais de gestion courante', 'classe' => 6, 'type' => 'charge', 'nature' => 'courant', 'utilisable_depense' => true, 'utilisable_budget' => true],
            ['numero' => '6181', 'libelle' => 'Honoraires syndic', 'classe' => 6, 'type' => 'charge', 'nature' => 'courant', 'utilisable_depense' => true, 'utilisable_budget' => true],
            ['numero' => '6188', 'libelle' => 'Autres charges de copropriété', 'classe' => 6, 'type' => 'charge', 'nature' => 'courant', 'utilisable_depense' => true, 'utilisable_budget' => true],
            ['numero' => '6311', 'libelle' => 'Intérêts des emprunts', 'classe' => 6, 'type' => 'charge', 'nature' => 'non_courant', 'utilisable_depense' => true],
            ['numero' => '7061', 'libelle' => 'Cotisations copropriétaires', 'classe' => 7, 'type' => 'produit', 'nature' => 'courant', 'utilisable_produit' => true],
            ['numero' => '7081', 'libelle' => 'Produits des activités annexes', 'classe' => 7, 'type' => 'produit', 'nature' => 'courant', 'utilisable_produit' => true],
            ['numero' => '7111', 'libelle' => 'Pénalités de retard', 'classe' => 7, 'type' => 'produit', 'nature' => 'courant', 'utilisable_produit' => true],
            ['numero' => '7381', 'libelle' => 'Intérêts et produits assimilés', 'classe' => 7, 'type' => 'produit', 'nature' => 'courant', 'utilisable_produit' => true],
        ];

        $ordre = 1;
        return array_map(function ($c) use (&$ordre) {
            return [
                'numero'              => $c['numero'],
                'libelle'             => $c['libelle'],
                'classe'              => $c['classe'],
                'type'                => $c['type'],
                'nature'              => $c['nature'] ?? 'courant',
                'est_sous_compte'     => strlen($c['numero']) > 3,
                'compte_parent'       => strlen($c['numero']) > 3 ? substr($c['numero'], 0, 3) : null,
                'utilisable_depense'  => $c['utilisable_depense'] ?? false,
                'utilisable_budget'   => $c['utilisable_budget'] ?? false,
                'utilisable_produit'  => $c['utilisable_produit'] ?? false,
                'ordre'               => $ordre++,
            ];
        }, $comptes);
    }
}
