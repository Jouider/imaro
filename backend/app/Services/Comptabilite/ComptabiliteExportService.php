<?php

namespace App\Services\Comptabilite;

use App\Models\AutreRecette;
use App\Models\Depense;
use App\Models\Emprunt;
use App\Models\Equipement;
use App\Models\Exercice;
use App\Models\Paiement;
use App\Models\Remboursement;
use App\Models\TravauxExceptionnel;
use Illuminate\Support\Collection;

/**
 * Source unique des données comptables (plan de comptes + écritures) réutilisée
 * par ComptabiliteController (JSON) et par les exports (xlsx / FEC / PDF — KAN-100).
 */
class ComptabiliteExportService
{
    /** Écritures composées brutes (paiements + dépenses) de l'exercice. */
    public function rawEntries(Exercice $exercice): Collection
    {
        $entries = collect();

        $paiements = Paiement::where('exercice_id', $exercice->id)
            ->with('coproprietaire.user')
            ->orderBy('date_paiement')
            ->get();

        foreach ($paiements as $p) {
            $entries->push([
                'id' => 'P'.$p->id,
                'date' => $p->date_paiement->toDateString(),
                'libelle' => 'Paiement '.$p->coproprietaire?->user?->name,
                'compte_debit' => '5121',
                'compte_credit' => '7061',
                'montant' => round($p->montant, 2),
                'piece' => $p->reference ?? 'PAY-'.$p->id,
                'exercice_id' => $exercice->id,
                'type' => 'encaissement',
            ]);

            // Chèque rejeté (KAN-85) : contre-passation (annule l'encaissement).
            if ($p->statut === 'cheque_rejete') {
                $entries->push([
                    'id' => 'R'.$p->id,
                    'date' => ($p->cheque_rejete_at ?? $p->date_paiement)->toDateString(),
                    'libelle' => 'Chèque impayé — '.$p->coproprietaire?->user?->name,
                    'compte_debit' => '7061',
                    'compte_credit' => '5121',
                    'montant' => round($p->montant, 2),
                    'piece' => 'REJ-'.$p->id,
                    'exercice_id' => $exercice->id,
                    'type' => 'depense',
                ]);
            }
        }

        $depenses = Depense::where('exercice_id', $exercice->id)
            ->where('statut', '!=', 'annule')
            ->orderBy('date')
            ->get();

        $categorieToCompte = [
            'entretien' => '6135',
            'gardiennage' => '6138',
            'nettoyage' => '6131',
            'assurance' => '6136',
            'administratif' => '6171',
            'travaux' => '6134',
            'autre' => '6188',
        ];

        foreach ($depenses as $d) {
            $compteDebit = $categorieToCompte[strtolower($d->categorie)] ?? '6188';
            $compteCredit = $d->statut === 'paye' ? '5121' : '4011';

            $entries->push([
                'id' => 'D'.$d->id,
                'date' => $d->date->toDateString(),
                'libelle' => $d->description,
                'compte_debit' => $compteDebit,
                'compte_credit' => $compteCredit,
                'montant' => round($d->montant, 2),
                'piece' => 'DEP-'.$d->id,
                'exercice_id' => $exercice->id,
                'type' => 'depense',
            ]);
        }

        // Autres recettes (KAN-130) : encaissement produit → débit banque, crédit
        // le compte de produit (classe 7) correspondant à la catégorie. La table
        // porte l'exercice par année (colonne `exercice`), pas par FK.
        $categorieToProduit = [
            'location_parking' => '7082',
            'location_salle' => '7082',
            'location_antenne' => '7082',
            'subvention' => '7500',
            'indemnite_assurance' => '7181',
            'penalite_retard' => '7111',
            'produits_financiers' => '7381',
            'autre' => '7081',
        ];

        $recettes = AutreRecette::where('residence_id', $exercice->residence_id)
            ->where('exercice', $exercice->annee)
            ->orderBy('date')
            ->get();

        foreach ($recettes as $r) {
            $compteProduit = $categorieToProduit[$r->categorie] ?? '7081';

            $entries->push([
                'id' => 'AR'.$r->id,
                'date' => $r->date->toDateString(),
                'libelle' => $r->libelle,
                'compte_debit' => '5121',
                'compte_credit' => $compteProduit,
                'montant' => round($r->montant, 2),
                'piece' => $r->reference ?? 'REC-'.$r->id,
                'exercice_id' => $exercice->id,
                'type' => 'encaissement',
            ]);
        }

        // ── Opérations diverses → journal (KAN-130, 2..5/5) ───────────────────
        // Ces tables ne portent pas d'exercice_id : rattachement par résidence +
        // date dans la fenêtre de l'exercice. Comptes conventionnels (Décret
        // 2.23.700 / CGNC) — à faire valider par la comptabilité.
        $debut = $exercice->date_debut?->toDateString();
        $fin = $exercice->date_fin?->toDateString();
        $inExercice = fn (?string $date): bool => $date !== null
            && ($debut === null || $date >= $debut)
            && ($fin === null || $date <= $fin);

        // Remboursements payés → sortie de banque (débit 4411 copro créditeur / crédit 5121).
        $remboursements = Remboursement::where('residence_id', $exercice->residence_id)
            ->where('statut', 'paye')
            ->whereNotNull('date_paiement')
            ->orderBy('date_paiement')
            ->get();

        foreach ($remboursements as $rb) {
            $date = $rb->date_paiement?->toDateString();
            if (! $inExercice($date)) {
                continue;
            }
            $entries->push([
                'id' => 'RB'.$rb->id,
                'date' => $date,
                'libelle' => 'Remboursement — '.($rb->coproprietaire_nom ?: ($rb->description ?: $rb->motif)),
                'compte_debit' => '4411',
                'compte_credit' => '5121',
                'montant' => round($rb->montant, 2),
                'piece' => $rb->reference ?? 'RMB-'.$rb->id,
                'exercice_id' => $exercice->id,
                'type' => 'depense',
            ]);
        }

        // Travaux exceptionnels réglés → charge non courante (débit 6500 / crédit 5121).
        $travaux = TravauxExceptionnel::where('residence_id', $exercice->residence_id)
            ->where('montant_regle', '>', 0)
            ->get();

        foreach ($travaux as $tx) {
            $date = ($tx->date_fin_reelle ?? $tx->date_debut)?->toDateString();
            if (! $inExercice($date)) {
                continue;
            }
            $entries->push([
                'id' => 'TX'.$tx->id,
                'date' => $date,
                'libelle' => 'Travaux exceptionnels — '.$tx->libelle,
                'compte_debit' => '6500',
                'compte_credit' => '5121',
                'montant' => round($tx->montant_regle, 2),
                'piece' => 'TRX-'.$tx->id,
                'exercice_id' => $exercice->id,
                'type' => 'depense',
            ]);
        }

        // Équipements acquis → immobilisation (débit 2300 / crédit 5121). La dotation
        // aux amortissements n'est pas encore comptabilisée — à cadrer avec la compta.
        $equipements = Equipement::where('residence_id', $exercice->residence_id)->get();

        foreach ($equipements as $eq) {
            $date = $eq->date_acquisition?->toDateString();
            if (! $inExercice($date)) {
                continue;
            }
            $entries->push([
                'id' => 'EQ'.$eq->id,
                'date' => $date,
                'libelle' => 'Acquisition équipement — '.$eq->designation,
                'compte_debit' => '2300',
                'compte_credit' => '5121',
                'montant' => round($eq->valeur_acquisition, 2),
                'piece' => 'EQP-'.$eq->id,
                'exercice_id' => $exercice->id,
                'type' => 'depense',
            ]);
        }

        // Emprunts : déblocage (débit 5121 / crédit 1481) si contracté dans l'exercice ;
        // remboursements cumulés de l'exercice (débit 1481 / crédit 5121). La ventilation
        // capital / intérêts (6311) n'est pas séparée ici — à affiner avec la compta.
        $emprunts = Emprunt::where('residence_id', $exercice->residence_id)->get();

        foreach ($emprunts as $emp) {
            $dateDebut = $emp->date_debut?->toDateString();
            if ($inExercice($dateDebut) && $emp->montant_initial > 0) {
                $entries->push([
                    'id' => 'EMP'.$emp->id,
                    'date' => $dateDebut,
                    'libelle' => 'Déblocage emprunt — '.($emp->organisme ?: $emp->libelle),
                    'compte_debit' => '5121',
                    'compte_credit' => '1481',
                    'montant' => round($emp->montant_initial, 2),
                    'piece' => 'EMP-'.$emp->id,
                    'exercice_id' => $exercice->id,
                    'type' => 'encaissement',
                ]);
            }
            if (($emp->paye_exercice ?? 0) > 0) {
                $entries->push([
                    'id' => 'EMR'.$emp->id,
                    'date' => $fin ?? $dateDebut,
                    'libelle' => 'Remboursement emprunt — '.($emp->organisme ?: $emp->libelle),
                    'compte_debit' => '1481',
                    'compte_credit' => '5121',
                    'montant' => round($emp->paye_exercice, 2),
                    'piece' => 'EMR-'.$emp->id,
                    'exercice_id' => $exercice->id,
                    'type' => 'depense',
                ]);
            }
        }

        return $entries;
    }

    /** Lignes de journal aplaties (1 débit + 1 crédit par écriture). */
    public function journalRows(Exercice $exercice): array
    {
        $ref = collect($this->comptesReference())->keyBy('numero');
        $rows = [];

        foreach ($this->rawEntries($exercice) as $e) {
            foreach (['compte_debit' => true, 'compte_credit' => false] as $side => $isDebit) {
                $numero = $e[$side];
                $rows[] = [
                    'date' => $e['date'],
                    'numero_compte' => $numero,
                    'libelle_compte' => $ref[$numero]['libelle'] ?? 'Compte '.$numero,
                    'description' => $e['libelle'],
                    'debit' => $isDebit ? $e['montant'] : 0.0,
                    'credit' => $isDebit ? 0.0 : $e['montant'],
                    'piece' => $e['piece'],
                ];
            }
        }

        usort($rows, fn ($a, $b) => $a['date'] <=> $b['date']);

        return $rows;
    }

    /** Comptes du grand-livre avec lignes + totaux. */
    public function grandLivreComptes(Exercice $exercice): array
    {
        $ref = collect($this->comptesReference())->keyBy('numero');
        $comptes = [];

        foreach ($this->rawEntries($exercice) as $e) {
            foreach (['compte_debit', 'compte_credit'] as $side) {
                $numero = $e[$side];
                if (! isset($comptes[$numero])) {
                    $comptes[$numero] = [
                        'numero' => (string) $numero,
                        'libelle' => $ref[$numero]['libelle'] ?? 'Compte '.$numero,
                        'total_debit' => 0.0,
                        'total_credit' => 0.0,
                        'solde_final' => 0.0,
                        'lignes' => [],
                    ];
                }

                $isDebit = $side === 'compte_debit';
                $running = ($comptes[$numero]['total_debit'] + ($isDebit ? $e['montant'] : 0))
                    - ($comptes[$numero]['total_credit'] + ($isDebit ? 0 : $e['montant']));

                $comptes[$numero]['lignes'][] = [
                    'date' => $e['date'],
                    'description' => $e['libelle'],
                    'debit' => $isDebit ? $e['montant'] : 0.0,
                    'credit' => $isDebit ? 0.0 : $e['montant'],
                    'solde' => round($running, 2),
                ];

                $comptes[$numero][$isDebit ? 'total_debit' : 'total_credit'] += $e['montant'];
            }
        }

        foreach ($comptes as &$c) {
            $c['solde_final'] = round($c['total_debit'] - $c['total_credit'], 2);
            $c['total_debit'] = round($c['total_debit'], 2);
            $c['total_credit'] = round($c['total_credit'], 2);
        }
        ksort($comptes);

        return array_values($comptes);
    }

    /** Lignes de balance (un poste par compte). */
    public function balanceRows(Exercice $exercice): array
    {
        $ref = collect($this->comptesReference())->keyBy('numero');
        $comptes = [];

        foreach ($this->rawEntries($exercice) as $e) {
            foreach (['compte_debit' => 'debit', 'compte_credit' => 'credit'] as $side => $col) {
                $numero = (string) $e[$side];
                $comptes[$numero] ??= ['debit' => 0.0, 'credit' => 0.0];
                $comptes[$numero][$col] += $e['montant'];
            }
        }
        ksort($comptes);

        return collect($comptes)->map(function ($t, $numero) use ($ref) {
            $numero = (string) $numero;
            $solde = round($t['debit'] - $t['credit'], 2);

            return [
                'numero' => $numero,
                'libelle' => $ref[$numero]['libelle'] ?? 'Compte '.$numero,
                'classe' => $ref[$numero]['classe'] ?? (int) substr($numero, 0, 1),
                'total_debit' => round($t['debit'], 2),
                'total_credit' => round($t['credit'], 2),
                'solde_debiteur' => $solde > 0 ? $solde : 0.0,
                'solde_crediteur' => $solde < 0 ? abs($solde) : 0.0,
            ];
        })->values()->all();
    }

    /**
     * Lignes FEC (Fichier des Écritures Comptables, norme DGFiP — 18 colonnes,
     * tabulé). Une écriture composée = 2 lignes (débit + crédit) partageant EcritureNum.
     */
    public function fecRows(Exercice $exercice): array
    {
        $ref = collect($this->comptesReference())->keyBy('numero');
        $rows = [];
        $num = 0;

        foreach ($this->rawEntries($exercice) as $e) {
            $num++;
            $isBanque = ($e['type'] ?? (str_starts_with($e['id'], 'P') ? 'encaissement' : 'depense')) === 'encaissement';
            $journalCode = $isBanque ? 'BQ' : 'AC';
            $journalLib = $isBanque ? 'Banque' : 'Achats';
            $date = str_replace('-', '', $e['date']); // YYYYMMDD

            foreach (['compte_debit' => true, 'compte_credit' => false] as $side => $isDebit) {
                $numero = $e[$side];
                $rows[] = [
                    'JournalCode' => $journalCode,
                    'JournalLib' => $journalLib,
                    'EcritureNum' => (string) $num,
                    'EcritureDate' => $date,
                    'CompteNum' => $numero,
                    'CompteLib' => $ref[$numero]['libelle'] ?? 'Compte '.$numero,
                    'CompAuxNum' => '',
                    'CompAuxLib' => '',
                    'PieceRef' => $e['piece'],
                    'PieceDate' => $date,
                    'EcritureLib' => $e['libelle'],
                    'Debit' => $isDebit ? $this->fecAmount($e['montant']) : '0,00',
                    'Credit' => $isDebit ? '0,00' : $this->fecAmount($e['montant']),
                    'EcritureLet' => '',
                    'DateLet' => '',
                    'ValidDate' => $date,
                    'Montantdevise' => '',
                    'Idevise' => '',
                ];
            }
        }

        return $rows;
    }

    private function fecAmount(float $n): string
    {
        return number_format($n, 2, ',', '');
    }

    /** Plan comptable copropriété — Décret 2.23.700 / CGNC (référentiel légal fixe). */
    public function comptesReference(): array
    {
        $depense = ['utilisable_depense' => true, 'utilisable_budget' => true];
        $produit = ['utilisable_produit' => true];

        $comptes = [
            ['numero' => '1100', 'libelle' => 'Fonds de réserve / travaux', 'classe' => 1, 'type' => 'capitaux', 'nature' => 'both'],
            ['numero' => '1200', 'libelle' => 'Résultat de l\'exercice', 'classe' => 1, 'type' => 'capitaux', 'nature' => 'both'],
            ['numero' => '1400', 'libelle' => 'Fonds de roulement', 'classe' => 1, 'type' => 'capitaux', 'nature' => 'both'],
            ['numero' => '1481', 'libelle' => 'Emprunts auprès des établissements de crédit', 'classe' => 1, 'type' => 'capitaux', 'nature' => 'non_courant'],
            ['numero' => '1500', 'libelle' => 'Provisions pour charges', 'classe' => 1, 'type' => 'capitaux', 'nature' => 'both'],
            ['numero' => '1750', 'libelle' => 'Avances reçues des copropriétaires', 'classe' => 1, 'type' => 'capitaux', 'nature' => 'both'],
            ['numero' => '2300', 'libelle' => 'Installations techniques, matériel et équipements', 'classe' => 2, 'type' => 'actif', 'nature' => 'non_courant'],
            ['numero' => '2832', 'libelle' => 'Amortissements des équipements', 'classe' => 2, 'type' => 'actif', 'nature' => 'non_courant'],
            ['numero' => '3421', 'libelle' => 'Avances et acomptes versés', 'classe' => 3, 'type' => 'actif', 'nature' => 'courant'],
            ['numero' => '3431', 'libelle' => 'Avances et acomptes versés aux fournisseurs', 'classe' => 3, 'type' => 'actif', 'nature' => 'courant'],
            ['numero' => '3488', 'libelle' => 'Débiteurs divers', 'classe' => 3, 'type' => 'actif', 'nature' => 'courant'],
            ['numero' => '3500', 'libelle' => 'Titres et valeurs de placement', 'classe' => 3, 'type' => 'actif', 'nature' => 'courant'],
            ['numero' => '4011', 'libelle' => 'Fournisseurs', 'classe' => 4, 'type' => 'passif', 'nature' => 'courant', 'utilisable_depense' => true],
            ['numero' => '4017', 'libelle' => 'Fournisseurs — retenues de garantie', 'classe' => 4, 'type' => 'passif', 'nature' => 'courant'],
            ['numero' => '4111', 'libelle' => 'Copropriétaires — cotisations à recevoir', 'classe' => 4, 'type' => 'actif', 'nature' => 'courant'],
            ['numero' => '4411', 'libelle' => 'Copropriétaires créditeurs (avances / trop-perçu)', 'classe' => 4, 'type' => 'passif', 'nature' => 'courant'],
            ['numero' => '4417', 'libelle' => 'État — impôts et taxes', 'classe' => 4, 'type' => 'passif', 'nature' => 'courant'],
            ['numero' => '4432', 'libelle' => 'Rémunérations dues au personnel', 'classe' => 4, 'type' => 'passif', 'nature' => 'courant'],
            ['numero' => '4441', 'libelle' => 'Organismes sociaux (CNSS / AMO)', 'classe' => 4, 'type' => 'passif', 'nature' => 'courant'],
            ['numero' => '4485', 'libelle' => 'Créditeurs divers', 'classe' => 4, 'type' => 'passif', 'nature' => 'courant'],
            ['numero' => '5121', 'libelle' => 'Banque', 'classe' => 5, 'type' => 'tresorerie', 'nature' => 'courant'],
            ['numero' => '5141', 'libelle' => 'Chèques et valeurs à encaisser', 'classe' => 5, 'type' => 'tresorerie', 'nature' => 'courant'],
            ['numero' => '5161', 'libelle' => 'Caisse', 'classe' => 5, 'type' => 'tresorerie', 'nature' => 'courant'],
            ['numero' => '6111', 'libelle' => 'Achats de fournitures et consommables', 'classe' => 6, 'type' => 'charge', 'nature' => 'courant'] + $depense,
            ['numero' => '6121', 'libelle' => 'Eau et électricité', 'classe' => 6, 'type' => 'charge', 'nature' => 'courant'] + $depense,
            ['numero' => '6122', 'libelle' => 'Combustibles et gaz', 'classe' => 6, 'type' => 'charge', 'nature' => 'courant'] + $depense,
            ['numero' => '6125', 'libelle' => 'Fournitures d\'entretien et petit équipement', 'classe' => 6, 'type' => 'charge', 'nature' => 'courant'] + $depense,
            ['numero' => '6131', 'libelle' => 'Nettoyage des locaux', 'classe' => 6, 'type' => 'charge', 'nature' => 'courant'] + $depense,
            ['numero' => '6132', 'libelle' => 'Enlèvement des ordures et déchets', 'classe' => 6, 'type' => 'charge', 'nature' => 'courant'] + $depense,
            ['numero' => '6133', 'libelle' => 'Entretien des espaces verts', 'classe' => 6, 'type' => 'charge', 'nature' => 'courant'] + $depense,
            ['numero' => '6134', 'libelle' => 'Contrats de maintenance', 'classe' => 6, 'type' => 'charge', 'nature' => 'courant'] + $depense,
            ['numero' => '6135', 'libelle' => 'Entretien et petites réparations', 'classe' => 6, 'type' => 'charge', 'nature' => 'courant'] + $depense,
            ['numero' => '6136', 'libelle' => 'Primes d\'assurances', 'classe' => 6, 'type' => 'charge', 'nature' => 'courant'] + $depense,
            ['numero' => '6137', 'libelle' => 'Maintenance ascenseur', 'classe' => 6, 'type' => 'charge', 'nature' => 'courant'] + $depense,
            ['numero' => '6138', 'libelle' => 'Autres rémunérations (gardiennage)', 'classe' => 6, 'type' => 'charge', 'nature' => 'courant'] + $depense,
            ['numero' => '6141', 'libelle' => 'Charges de gardiennage et sécurité', 'classe' => 6, 'type' => 'charge', 'nature' => 'courant'] + $depense,
            ['numero' => '6142', 'libelle' => 'Télésurveillance', 'classe' => 6, 'type' => 'charge', 'nature' => 'courant'] + $depense,
            ['numero' => '6151', 'libelle' => 'Locations de matériel', 'classe' => 6, 'type' => 'charge', 'nature' => 'courant'] + $depense,
            ['numero' => '6167', 'libelle' => 'Frais et commissions bancaires', 'classe' => 6, 'type' => 'charge', 'nature' => 'courant'] + $depense,
            ['numero' => '6171', 'libelle' => 'Frais de gestion courante', 'classe' => 6, 'type' => 'charge', 'nature' => 'courant'] + $depense,
            ['numero' => '6174', 'libelle' => 'Frais postaux et télécommunications', 'classe' => 6, 'type' => 'charge', 'nature' => 'courant'] + $depense,
            ['numero' => '6177', 'libelle' => 'Charges de personnel et cotisations sociales', 'classe' => 6, 'type' => 'charge', 'nature' => 'courant'] + $depense,
            ['numero' => '6181', 'libelle' => 'Honoraires syndic', 'classe' => 6, 'type' => 'charge', 'nature' => 'courant'] + $depense,
            ['numero' => '6182', 'libelle' => 'Honoraires comptable / expert-comptable', 'classe' => 6, 'type' => 'charge', 'nature' => 'courant'] + $depense,
            ['numero' => '6185', 'libelle' => 'Frais d\'actes et de contentieux (recouvrement)', 'classe' => 6, 'type' => 'charge', 'nature' => 'courant'] + $depense,
            ['numero' => '6188', 'libelle' => 'Autres charges de copropriété', 'classe' => 6, 'type' => 'charge', 'nature' => 'courant'] + $depense,
            ['numero' => '6311', 'libelle' => 'Intérêts des emprunts', 'classe' => 6, 'type' => 'charge', 'nature' => 'non_courant', 'utilisable_depense' => true],
            ['numero' => '6500', 'libelle' => 'Charges non courantes (travaux exceptionnels)', 'classe' => 6, 'type' => 'charge', 'nature' => 'non_courant'] + $depense,
            ['numero' => '7061', 'libelle' => 'Cotisations copropriétaires', 'classe' => 7, 'type' => 'produit', 'nature' => 'courant'] + $produit,
            ['numero' => '7062', 'libelle' => 'Appels de fonds — travaux', 'classe' => 7, 'type' => 'produit', 'nature' => 'non_courant'] + $produit,
            ['numero' => '7063', 'libelle' => 'Appels de fonds — fonds de réserve', 'classe' => 7, 'type' => 'produit', 'nature' => 'both'] + $produit,
            ['numero' => '7081', 'libelle' => 'Produits des activités annexes', 'classe' => 7, 'type' => 'produit', 'nature' => 'courant'] + $produit,
            ['numero' => '7082', 'libelle' => 'Produits de location (parties communes)', 'classe' => 7, 'type' => 'produit', 'nature' => 'courant'] + $produit,
            ['numero' => '7111', 'libelle' => 'Pénalités de retard', 'classe' => 7, 'type' => 'produit', 'nature' => 'courant'] + $produit,
            ['numero' => '7181', 'libelle' => 'Indemnités et remboursements (assurances)', 'classe' => 7, 'type' => 'produit', 'nature' => 'courant'] + $produit,
            ['numero' => '7381', 'libelle' => 'Intérêts et produits financiers', 'classe' => 7, 'type' => 'produit', 'nature' => 'courant'] + $produit,
            ['numero' => '7500', 'libelle' => 'Produits non courants', 'classe' => 7, 'type' => 'produit', 'nature' => 'non_courant'] + $produit,
        ];

        $ordre = 1;

        return array_map(function ($c) use (&$ordre) {
            return [
                'numero' => $c['numero'],
                'libelle' => $c['libelle'],
                'classe' => $c['classe'],
                'type' => $c['type'],
                'nature' => $c['nature'] ?? 'courant',
                'est_sous_compte' => strlen($c['numero']) > 3,
                'compte_parent' => strlen($c['numero']) > 3 ? substr($c['numero'], 0, 3) : null,
                'utilisable_depense' => $c['utilisable_depense'] ?? false,
                'utilisable_budget' => $c['utilisable_budget'] ?? false,
                'utilisable_produit' => $c['utilisable_produit'] ?? false,
                'ordre' => $ordre++,
            ];
        }, $comptes);
    }
}
