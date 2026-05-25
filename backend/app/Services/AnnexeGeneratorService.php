<?php

namespace App\Services;

use App\Models\AnnexeCache;
use App\Models\AppelFonds;
use App\Models\Depense;
use App\Models\Lot;
use App\Models\Paiement;
use App\Models\Residence;
use Illuminate\Support\Facades\DB;

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

        // Cache the result
        AnnexeCache::updateOrCreate(
            [
                'residence_id' => $residence->id,
                'exercice' => $exercice,
                'annexe_num' => $annexeNum,
            ],
            [
                'data' => $data,
                'generated_at' => now(),
                'generated_by' => $userId,
            ]
        );

        return $data;
    }

    protected function generateAnnexe10(Residence $residence, int $exercice): array
    {
        $exerciceModel = $residence->exercices()->where('annee', $exercice)->first();
        if (!$exerciceModel) {
            return ['error' => 'Exercice non trouvé'];
        }

        $lots = $residence->lots()->with('coproprietairePrincipal.user')->get();

        $contributions = [];
        $totalAppels = 0;
        $totalPaiements = 0;

        foreach ($lots as $lot) {
            $copro = $lot->coproprietairePrincipal;

            // Sum appels for this lot's coproprietaire in this exercice
            $appelsMontant = 0;
            $paiementsMontant = 0;

            if ($copro) {
                $appelsMontant = DB::table('appels_fonds_lignes')
                    ->join('appels_fonds', 'appels_fonds.id', '=', 'appels_fonds_lignes.appel_fonds_id')
                    ->where('appels_fonds.exercice_id', $exerciceModel->id)
                    ->where('appels_fonds_lignes.coproprietaire_id', $copro->id)
                    ->where('appels_fonds.statut', '!=', 'brouillon')
                    ->sum('appels_fonds_lignes.montant_du');

                $paiementsMontant = Paiement::where('exercice_id', $exerciceModel->id)
                    ->where('coproprietaire_id', $copro->id)
                    ->sum('montant');
            }

            $solde = $paiementsMontant - $appelsMontant;

            $contributions[] = [
                'lot_numero' => $lot->numero,
                'coproprietaire_nom' => $copro?->user?->name ?? 'Non assigné',
                'tantieme' => $lot->tantieme,
                'appels_emis' => round($appelsMontant, 2),
                'paiements_recus' => round($paiementsMontant, 2),
                'solde' => round($solde, 2),
                'statut' => $solde >= 0 ? 'a_jour' : 'en_retard',
            ];

            $totalAppels += $appelsMontant;
            $totalPaiements += $paiementsMontant;
        }

        return [
            'exercice' => $exercice,
            'residence' => ['id' => $residence->id, 'nom' => $residence->name],
            'contributions' => $contributions,
            'totaux' => [
                'tantiemes' => (int) $lots->sum('tantieme'),
                'appels' => round($totalAppels, 2),
                'paiements' => round($totalPaiements, 2),
                'solde' => round($totalPaiements - $totalAppels, 2),
            ],
        ];
    }

    protected function generateAnnexe13_1(Residence $residence, int $exercice): array
    {
        $exerciceModel = $residence->exercices()->where('annee', $exercice)->first();
        if (!$exerciceModel) {
            return ['error' => 'Exercice non trouvé'];
        }

        $totalPaiements = Paiement::where('exercice_id', $exerciceModel->id)->sum('montant');
        $totalDepenses = Depense::where('exercice_id', $exerciceModel->id)->sum('montant');

        $totalAppels = DB::table('appels_fonds_lignes')
            ->join('appels_fonds', 'appels_fonds.id', '=', 'appels_fonds_lignes.appel_fonds_id')
            ->where('appels_fonds.exercice_id', $exerciceModel->id)
            ->where('appels_fonds.statut', '!=', 'brouillon')
            ->sum('appels_fonds_lignes.montant_du');

        $creances = round($totalAppels - $totalPaiements, 2);
        $tresorerie = round($totalPaiements - $totalDepenses, 2);
        $totalActif = round($creances + $tresorerie, 2);

        return [
            'exercice' => $exercice,
            'actif' => [
                'immobilisations' => 0,
                'creances' => max(0, $creances),
                'tresorerie' => ['banque' => max(0, $tresorerie), 'caisse' => 0],
                'total' => max(0, $totalActif),
            ],
            'passif' => [
                'fonds_copro' => 0,
                'fonds_reserve' => 0,
                'resultat_exercice' => round($totalPaiements - $totalDepenses, 2),
                'dettes' => 0,
                'total' => max(0, $totalActif),
            ],
        ];
    }

    protected function generateAnnexe13_2(Residence $residence, int $exercice): array
    {
        $exerciceModel = $residence->exercices()->where('annee', $exercice)->first();
        if (!$exerciceModel) {
            return ['error' => 'Exercice non trouvé'];
        }

        $totalAppels = DB::table('appels_fonds_lignes')
            ->join('appels_fonds', 'appels_fonds.id', '=', 'appels_fonds_lignes.appel_fonds_id')
            ->where('appels_fonds.exercice_id', $exerciceModel->id)
            ->where('appels_fonds.statut', '!=', 'brouillon')
            ->sum('appels_fonds_lignes.montant_du');

        $depenses = Depense::where('exercice_id', $exerciceModel->id)
            ->select('categorie', DB::raw('SUM(montant) as total'))
            ->groupBy('categorie')
            ->pluck('total', 'categorie')
            ->toArray();

        $totalDepenses = array_sum($depenses);

        return [
            'exercice' => $exercice,
            'produits' => [
                'appels_fonds' => round($totalAppels, 2),
                'autres_recettes' => 0,
                'produits_financiers' => 0,
                'total' => round($totalAppels, 2),
            ],
            'charges' => [
                'entretien_courant' => round($depenses['entretien'] ?? $depenses['maintenance'] ?? 0, 2),
                'fluides' => round($depenses['fluides'] ?? $depenses['eau_electricite'] ?? 0, 2),
                'honoraires_syndic' => round($depenses['honoraires'] ?? $depenses['syndic'] ?? 0, 2),
                'charges_personnel' => round($depenses['personnel'] ?? $depenses['salaires'] ?? 0, 2),
                'autres_charges' => round($totalDepenses - ($depenses['entretien'] ?? $depenses['maintenance'] ?? 0) - ($depenses['fluides'] ?? $depenses['eau_electricite'] ?? 0) - ($depenses['honoraires'] ?? $depenses['syndic'] ?? 0) - ($depenses['personnel'] ?? $depenses['salaires'] ?? 0), 2),
                'total' => round($totalDepenses, 2),
            ],
            'resultat' => round($totalAppels - $totalDepenses, 2),
        ];
    }
}
