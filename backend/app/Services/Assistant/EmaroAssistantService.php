<?php

namespace App\Services\Assistant;

use App\Models\Assemblee;
use App\Models\PenaltyConfig;
use App\Models\Residence;
use Illuminate\Support\Carbon;

/**
 * Assistant EMARO (KAN-107) — répond aux 4 questions clés du syndic, en croisant
 * le fonctionnement de SyndikPro et la Loi 18-00 / Décret 2.23.700. Les réponses
 * sont enrichies des données réelles de la résidence quand elle est fournie.
 */
class EmaroAssistantService
{
    public const PREAVIS_AG_JOURS = 15;          // Loi 18-00 art. 16quinquies

    public const MISE_EN_DEMEURE_JOURS = 30;     // Loi 18-00 art. 25

    /**
     * Définition centrale des 4 sujets : question, réponse (enrichie), références,
     * mots-clés de détection et citation légale. Source de faq() + cannedReply().
     */
    private function items(?Residence $residence): array
    {
        return [
            'penalites_retard' => [
                'question' => 'Comment calculer les pénalités de retard ?',
                'answer' => $this->penalites($residence),
                'refs' => ['Loi 18-00 art. 25'],
                'keywords' => ['penalit', 'retard', 'mise en demeure'],
                'citation' => ['article' => 'Article 25', 'loi' => 'Loi 18-00', 'excerpt' => 'Après une mise en demeure restée sans effet 30 jours, toutes les provisions de l\'exercice deviennent exigibles.'],
            ],
            'annexes' => [
                'question' => 'Quelles annexes dois-je générer ?',
                'answer' => $this->annexes(),
                'refs' => ['Décret 2.23.700'],
                'keywords' => ['annexe', 'etat des charges', 'comptes annexes'],
                'citation' => ['article' => 'Décret 2.23.700', 'loi' => 'Décret 2.23.700', 'excerpt' => 'Les comptes sont présentés selon des annexes normalisées, soumises à l\'AG d\'approbation et conservées 5 ans.'],
            ],
            'delai_convocation_ag' => [
                'question' => "Quel est le délai légal de convocation d'une AG ?",
                'answer' => $this->convocationAg($residence),
                'refs' => ['Loi 18-00 art. 16quinquies', 'art. 18', 'art. 19'],
                'keywords' => ['convocation', 'delai', 'assemblee', ' ag ', 'preavis'],
                'citation' => ['article' => 'Article 16quinquies', 'loi' => 'Loi 18-00', 'excerpt' => 'La convocation à l\'assemblée générale est adressée au moins 15 jours avant la réunion.'],
            ],
            'cloture_exercice' => [
                'question' => "Comment clôturer l'exercice comptable ?",
                'answer' => $this->clotureExercice(),
                'refs' => ['Décret 2.23.700'],
                'keywords' => ['clotur', 'exercice', 'arreter les comptes', 'cloture'],
                'citation' => ['article' => 'Décret 2.23.700', 'loi' => 'Décret 2.23.700', 'excerpt' => 'Les comptes de l\'exercice sont arrêtés, approuvés en AG et le résultat reporté ; pièces conservées 5 ans.'],
            ],
        ];
    }

    /** @return array<int,array{key:string,question:string,answer:string,refs:array<int,string>}> */
    public function faq(?Residence $residence = null): array
    {
        $out = [];
        foreach ($this->items($residence) as $key => $i) {
            $out[] = ['key' => $key, 'question' => $i['question'], 'answer' => $i['answer'], 'refs' => $i['refs']];
        }

        return $out;
    }

    /**
     * Réponse figée (déterministe) si la question correspond à l'un des 4 sujets.
     *
     * @return null|array{content:string,citations:array<int,array<string,string>>}
     */
    public function cannedReply(string $question, ?Residence $residence = null): ?array
    {
        $q = ' '.$this->normalize($question).' ';

        foreach ($this->items($residence) as $i) {
            foreach ($i['keywords'] as $kw) {
                if (str_contains($q, $this->normalize($kw))) {
                    return ['content' => $i['answer'], 'citations' => [$i['citation']]];
                }
            }
        }

        return null;
    }

    /** Minuscule + sans accents, pour une détection robuste de mots-clés. */
    private function normalize(string $s): string
    {
        $s = mb_strtolower($s);

        return strtr($s, ['à' => 'a', 'â' => 'a', 'ä' => 'a', 'é' => 'e', 'è' => 'e', 'ê' => 'e', 'ë' => 'e', 'î' => 'i', 'ï' => 'i', 'ô' => 'o', 'ö' => 'o', 'û' => 'u', 'ù' => 'u', 'ü' => 'u', 'ç' => 'c']);
    }

    private function penalites(?Residence $residence): string
    {
        $base = '**Loi 18-00 (art. 25)** : après une **mise en demeure** restée sans effet '
            .self::MISE_EN_DEMEURE_JOURS." jours, toutes les provisions de l'exercice deviennent exigibles. "
            ."Les pénalités découlent du règlement de copropriété ou d'une décision d'AG.\n\n"
            .'Dans SyndikPro, elles se règlent par résidence (écran **Pénalités**) : un **délai de grâce** '
            .'(aucune pénalité avant), un **type de taux** (`fixe` / `pourcentage` / `journalier`) et sa **valeur**. '
            .'Le calcul tourne automatiquement chaque nuit sur les lignes impayées. '
            ."Pour un impayé persistant, envoyez la **mise en demeure** (déclenche le compteur 30 j de l'art. 25).";

        if (! $residence) {
            return $base;
        }

        $cfg = PenaltyConfig::where('residence_id', $residence->id)->first();

        if (! $cfg || ! $cfg->enabled) {
            return $base."\n\n_Sur « {$residence->name} » : les pénalités ne sont pas encore activées — "
                .'activez-les dans Pénalités pour automatiser le calcul._';
        }

        $taux = match ($cfg->rate_type) {
            'fixed' => number_format($cfg->rate_value, 2, ',', ' ').' DH par échéance en retard',
            'daily' => $this->trim($cfg->rate_value).' % par jour de retard',
            default => $this->trim($cfg->rate_value).' % du montant impayé',
        };
        $cap = $cfg->cap_max_montant ? ', plafonné à '.number_format($cfg->cap_max_montant, 2, ',', ' ').' DH' : '';

        return $base."\n\n_Sur « {$residence->name} » (configuration active) : délai de grâce "
            ."**{$cfg->grace_period_days} jours**, taux **{$taux}**{$cap}._";
    }

    private function annexes(): string
    {
        return '**Décret 2.23.700** : les comptes sont présentés selon des **annexes normalisées**, '
            ."soumises à l'AG d'approbation et **conservées 5 ans**.\n\n"
            ."Dans SyndikPro (Comptabilité → Annexes), à générer pour chaque exercice avant l'AG :\n"
            ."- **Annexe 10** — état des charges par nature ;\n"
            ."- **Annexe 13-1** — dettes & créances (exercice courant vs précédent) ;\n"
            ."- **Annexe 13-2** — détail du résultat (excédent/déficit, recettes, dépenses).\n\n"
            ."Comptabilité **d'engagement** obligatoire (pas de caisse simple). "
            .'Si les recettes dépassent **1 000 000 MAD**, un **audit par expert-comptable** est obligatoire.';
    }

    private function convocationAg(?Residence $residence): string
    {
        $base = '**Loi 18-00 (art. 16quinquies)** : la convocation est adressée **au moins '
            .self::PREAVIS_AG_JOURS." jours** avant l'AG, avec **ordre du jour + date / heure / lieu**. "
            ."Quorum **50 %** des copropriétaires (art. 18) ; élection du syndic à la **majorité des 3/4** (art. 19).\n\n"
            ."Dans SyndikPro, à la création d'une AG le système **alerte si la date est à moins de 15 jours**. "
            .'« Générer les convocations » produit une convocation PDF par copropriétaire (nom, lot, tantièmes, '
            .'ODJ, préavis, pouvoir/procuration) + un PDF fusionné « Imprimer tout ». Conservation 5 ans.';

        if (! $residence) {
            return $base;
        }

        $prochaine = Assemblee::where('residence_id', $residence->id)
            ->whereDate('date', '>=', Carbon::today())
            ->orderBy('date')->first();

        if (! $prochaine) {
            return $base;
        }

        $date = Carbon::parse($prochaine->date);
        $jours = Carbon::today()->diffInDays($date, false);
        $alerte = $jours < self::PREAVIS_AG_JOURS
            ? " ⚠️ Préavis insuffisant ({$jours} j < 15 j) : repoussez la date ou justifiez l'urgence."
            : '';

        return $base."\n\n_Prochaine AG sur « {$residence->name} » : **{$prochaine->titre}** le **"
            .$date->format('d/m/Y')."** (dans {$jours} j).{$alerte}_";
    }

    private function clotureExercice(): string
    {
        return '**Décret 2.23.700** : les comptes sont arrêtés, **approuvés en AG**, le résultat est reporté, '
            ."et les pièces conservées **5 ans**.\n\n"
            ."Dans SyndikPro, dans l'ordre :\n"
            ."1. Saisir **toutes** les dépenses et encaissements de l'exercice.\n"
            ."2. Vérifier **journal / grand-livre / balance** (débit = crédit).\n"
            ."3. Générer les **annexes** (10, 13-1, 13-2) pour l'AG d'approbation.\n"
            .'4. **Clôturer** (Comptabilité → Clôturer) : le statut passe à *clôturé*, **plus aucune écriture '
            ."possible**, et le solde est reporté sur l'exercice suivant.\n\n"
            ."Rappel : un **budget voté** est obligatoire avant tout décaissement ; ne clôturez qu'**après "
            .'approbation des comptes en AG**.';
    }

    private function trim(float $n): string
    {
        return rtrim(rtrim(number_format($n, 2, ',', ''), '0'), ',');
    }
}
