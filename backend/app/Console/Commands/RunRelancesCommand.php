<?php

namespace App\Console\Commands;

use App\Models\AppelFondsLigne;
use App\Models\NotificationLog;
use App\Models\RelanceScenario;
use App\Services\Notifications\PortailPushNotifier;
use Carbon\Carbon;
use Illuminate\Console\Command;

/**
 * Exécute les scénarios de relance de recouvrement (KAN-87). Pour chaque
 * résidence avec un scénario activé, relance les impayés dont le nombre de
 * jours de retard correspond au délai J+X d'une étape. Traçabilité dans
 * notifications_log. Tourne quotidiennement (cf. routes/console.php).
 *
 * Note : la livraison multi-canal réelle (WhatsApp/SMS/e-mail) passe par les
 * providers de NotificationManager ; ici on déclenche la notification portail
 * (push) et on journalise le canal prévu de chaque étape.
 */
class RunRelancesCommand extends Command
{
    protected $signature = 'relances:run';

    protected $description = 'Exécute les scénarios de relance de recouvrement (étapes J+X par résidence).';

    public function handle(PortailPushNotifier $notifier): int
    {
        $scenarios = RelanceScenario::with('steps', 'residence')->where('enabled', true)->get();
        $total = 0;

        foreach ($scenarios as $scenario) {
            if ($scenario->steps->isEmpty()) {
                continue;
            }

            $lignes = AppelFondsLigne::whereHas('appelFonds', fn ($q) => $q->withoutGlobalScope('tenant')
                ->where('residence_id', $scenario->residence_id)
                ->where('statut', '!=', 'brouillon')
                ->where('date_echeance', '<', now()))
                ->where('statut', '!=', 'paye')
                ->with(['appelFonds' => fn ($q) => $q->withoutGlobalScope('tenant'), 'coproprietaire.user'])
                ->get();

            foreach ($lignes as $ligne) {
                $echeance = $ligne->appelFonds?->date_echeance;
                if (! $echeance) {
                    continue;
                }
                $joursRetard = (int) Carbon::parse($echeance)->startOfDay()->diffInDays(now()->startOfDay());

                // Étape dont le délai J+X correspond exactement au retard du jour
                // → déclenchement unique (la commande tourne 1×/jour).
                foreach ($scenario->steps->where('delai_jours', $joursRetard) as $step) {
                    $this->declencher($scenario, $ligne, $step, $notifier);
                    $total++;
                }
            }
        }

        $this->info("Relances déclenchées : {$total}");

        return self::SUCCESS;
    }

    private function declencher(RelanceScenario $scenario, AppelFondsLigne $ligne, $step, PortailPushNotifier $notifier): void
    {
        $copro = $ligne->coproprietaire;
        $reste = max(0, round((float) $ligne->montant_du - (float) $ligne->montant_paye, 2));

        // Notification portail (best-effort).
        if ($copro) {
            $notifier->rappelPaiement($copro, $reste);
        }

        // Traçabilité (notifications_log) — canal prévu + type d'étape.
        $libelle = $step->type === 'mise_en_demeure' ? 'Mise en demeure' : 'Relance';
        NotificationLog::create([
            'tenant_id' => $scenario->tenant_id,
            'user_id' => $copro?->user_id,
            'canal' => $step->canal,
            'template_name' => 'relance_'.$step->type,
            'content_preview' => "{$libelle} (J+{$step->delai_jours}) — solde {$reste} DH",
            'statut' => 'envoye',
            'sent_at' => now(),
        ]);
    }
}
