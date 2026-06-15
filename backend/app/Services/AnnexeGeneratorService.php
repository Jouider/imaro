<?php

namespace App\Services;

use App\Models\AnnexeCache;
use App\Models\Depense;
use App\Models\Exercice;
use App\Models\Paiement;
use App\Models\Residence;
use Illuminate\Support\Facades\DB;

/**
 * Génère les annexes comptables (Décret 2.23.700).
 *
 * IMPORTANT : la forme retournée doit correspondre EXACTEMENT au contrat
 * consommé par le générateur PDF frontend (frontend/src/lib/annexes-pdf.ts) :
 *   - 10   → { totals:{soldeInitial,appele,paye,soldeFinal}, rows:[…] }
 *   - 13-1 → { current:{fondsReserve,creances,dettes,tresorerie}, previous:{…} }
 *   - 13-2 → { excedent, recettes:{…Quad}, depenses:{…Quad} } (Quad = {n1,n,n0,nMinus1})
 * Une forme différente fait planter le PDF (lecture de champs undefined).
 */
class AnnexeGeneratorService
{
    public function generate(Residence $residence, int $exercice, string $annexeNum, int $userId): array
    {
        $data = match ($annexeNum) {
            '10' => $this->generateAnnexe10($residence, $exercice),
            '13-1' => $this->generateAnnexe13_1($residence, $exercice),
            '13-2' => $this->generateAnnexe13_2($residence, $exercice),
            default => throw new \InvalidArgumentException("Annexe {$annexeNum} non supportée"),
        };

        AnnexeCache::updateOrCreate(
            ['residence_id' => $residence->id, 'exercice' => $exercice, 'annexe_num' => $annexeNum],
            ['data' => $data, 'generated_at' => now(), 'generated_by' => $userId],
        );

        return $data;
    }

    // ─── Annexe 10 — État des contributions des copropriétaires ──────────────
    protected function generateAnnexe10(Residence $residence, int $exercice): array
    {
        $ex = $this->exerciceFor($residence, $exercice);
        $lots = $residence->lots()->with('coproprietairePrincipal.user')->get();

        $rows = [];
        foreach ($lots as $lot) {
            $copro = $lot->coproprietairePrincipal;
            $appele = 0.0;
            $paye = 0.0;

            if ($copro && $ex) {
                $appele = (float) DB::table('appels_fonds_lignes')
                    ->join('appels_fonds', 'appels_fonds.id', '=', 'appels_fonds_lignes.appel_fonds_id')
                    ->where('appels_fonds.exercice_id', $ex->id)
                    ->where('appels_fonds.statut', '!=', 'brouillon')
                    ->where('appels_fonds_lignes.coproprietaire_id', $copro->id)
                    ->sum('appels_fonds_lignes.montant_du');

                $paye = (float) Paiement::where('exercice_id', $ex->id)
                    ->where('coproprietaire_id', $copro->id)
                    ->sum('montant');
            }

            $soldeInitial = 0.0; // bilan d'ouverture non géré (reprise N-1 à venir)
            $rows[] = [
                'lotNumero' => $lot->numero,
                'coproprietaireNom' => $copro?->user?->name ?? 'Non assigné',
                'soldeInitial' => $soldeInitial,
                'appele' => round($appele, 2),
                'paye' => round($paye, 2),
                'soldeFinal' => round($soldeInitial + $paye - $appele, 2),
            ];
        }

        $totals = [
            'soldeInitial' => round(array_sum(array_column($rows, 'soldeInitial')), 2),
            'appele' => round(array_sum(array_column($rows, 'appele')), 2),
            'paye' => round(array_sum(array_column($rows, 'paye')), 2),
            'soldeFinal' => round(array_sum(array_column($rows, 'soldeFinal')), 2),
        ];

        return ['totals' => $totals, 'rows' => $rows];
    }

    // ─── Annexe 13-1 — Situation financière (simplifiée) ─────────────────────
    protected function generateAnnexe13_1(Residence $residence, int $exercice): array
    {
        return [
            'current' => $this->bilan($residence, $exercice),
            'previous' => $this->bilan($residence, $exercice - 1),
        ];
    }

    private function bilan(Residence $residence, int $annee): array
    {
        $a = $this->yearAggregates($residence, $annee);

        return [
            'fondsReserve' => 0.0,
            'creances' => round(max(0, $a['appels'] - $a['paiements']), 2),
            'dettes' => 0.0,
            'tresorerie' => round($a['paiements'] - $a['depenses'], 2),
        ];
    }

    // ─── Annexe 13-2 — Compte des produits et charges + budget ───────────────
    protected function generateAnnexe13_2(Residence $residence, int $exercice): array
    {
        $cur = $this->yearAggregates($residence, $exercice);
        $prev = $this->yearAggregates($residence, $exercice - 1);

        $recettes = [
            'cotisations' => $this->quad($cur['appels'], $prev['appels']),
            'fondsReserve' => $this->quad(0, 0),
            'autresAg' => $this->quad(0, 0),
            'autresProduits' => $this->quad(0, 0),
        ];

        $depenses = [
            'matieres' => $this->quad($cur['buckets']['matieres'], $prev['buckets']['matieres']),
            'servicesExterieurs' => $this->quad($cur['buckets']['servicesExterieurs'], $prev['buckets']['servicesExterieurs']),
            'impotsTaxes' => $this->quad($cur['buckets']['impotsTaxes'], $prev['buckets']['impotsTaxes']),
            'personnel' => $this->quad($cur['buckets']['personnel'], $prev['buckets']['personnel']),
            'autresCharges' => $this->quad($cur['buckets']['autresCharges'], $prev['buckets']['autresCharges']),
        ];

        return [
            'excedent' => round($cur['appels'] - $cur['depenses'], 2),
            'recettes' => $recettes,
            'depenses' => $depenses,
        ];
    }

    // ─── Helpers ─────────────────────────────────────────────────────────────

    private function exerciceFor(Residence $residence, int $annee): ?Exercice
    {
        return $residence->exercices()->where('annee', $annee)->first();
    }

    /** Agrégats financiers d'un exercice (appels émis, paiements, dépenses + ventilation). */
    private function yearAggregates(Residence $residence, int $annee): array
    {
        $ex = $this->exerciceFor($residence, $annee);
        $buckets = ['matieres' => 0.0, 'servicesExterieurs' => 0.0, 'impotsTaxes' => 0.0, 'personnel' => 0.0, 'autresCharges' => 0.0];

        if (! $ex) {
            return ['appels' => 0.0, 'paiements' => 0.0, 'depenses' => 0.0, 'buckets' => $buckets];
        }

        $appels = (float) DB::table('appels_fonds_lignes')
            ->join('appels_fonds', 'appels_fonds.id', '=', 'appels_fonds_lignes.appel_fonds_id')
            ->where('appels_fonds.exercice_id', $ex->id)
            ->where('appels_fonds.statut', '!=', 'brouillon')
            ->sum('appels_fonds_lignes.montant_du');

        $paiements = (float) Paiement::where('exercice_id', $ex->id)->sum('montant');

        $depenses = 0.0;
        foreach (Depense::where('exercice_id', $ex->id)->get(['categorie', 'montant']) as $d) {
            $montant = (float) $d->montant;
            $depenses += $montant;
            $buckets[$this->bucket((string) $d->categorie)] += $montant;
        }

        return ['appels' => $appels, 'paiements' => $paiements, 'depenses' => round($depenses, 2), 'buckets' => $buckets];
    }

    /** Ventile une catégorie de dépense (chaîne libre) vers un poste du compte de gestion. */
    private function bucket(string $categorie): string
    {
        $c = mb_strtolower($categorie);

        return match (true) {
            $this->has($c, ['personnel', 'salaire', 'gardien', 'paie', 'concierge']) => 'personnel',
            $this->has($c, ['impot', 'taxe', 'tva', 'fiscal']) => 'impotsTaxes',
            $this->has($c, ['fourniture', 'materiel', 'achat', 'matiere', 'consommable']) => 'matieres',
            $this->has($c, ['entretien', 'maintenance', 'fluide', 'eau', 'electric', 'honoraire', 'syndic', 'assurance', 'nettoyage', 'ascenseur', 'service']) => 'servicesExterieurs',
            default => 'autresCharges',
        };
    }

    private function has(string $haystack, array $needles): bool
    {
        foreach ($needles as $n) {
            if (str_contains($haystack, $n)) {
                return true;
            }
        }

        return false;
    }

    /** Colonne Quad du PDF : n = exercice clos (N), nMinus1 = exercice précédent (N-1). */
    private function quad(float $n, float $nMinus1, float $budget = 0.0): array
    {
        return ['n1' => round($budget, 2), 'n' => round($n, 2), 'n0' => 0.0, 'nMinus1' => round($nMinus1, 2)];
    }
}
