<?php

namespace App\Jobs;

use App\Models\PenaltyConfig;
use App\Models\Paiement;
use Carbon\Carbon;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class PenaltyCalculatorJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public function handle(): void
    {
        $configs = PenaltyConfig::where('enabled', true)->get();

        foreach ($configs as $config) {
            $this->processResidence($config);
        }
    }

    protected function processResidence(PenaltyConfig $config): void
    {
        // Get all unpaid lines for this residence
        $impayesLignes = DB::table('appels_fonds_lignes as afl')
            ->join('appels_fonds as af', 'af.id', '=', 'afl.appel_fonds_id')
            ->where('af.residence_id', $config->residence_id)
            ->where('af.statut', 'envoye')
            ->whereColumn('afl.montant_paye', '<', 'afl.montant_du')
            ->select('afl.id', 'afl.montant_du', 'afl.montant_paye', 'af.date_echeance')
            ->get();

        foreach ($impayesLignes as $ligne) {
            $dueDate = Carbon::parse($ligne->date_echeance);
            $daysOverdue = (int) now()->diffInDays($dueDate);

            if ($daysOverdue <= $config->grace_period_days) {
                continue;
            }

            $impaye = $ligne->montant_du - $ligne->montant_paye;
            $daysOverGrace = $daysOverdue - $config->grace_period_days;
            $penalty = $this->calculatePenalty($config, $impaye, $daysOverGrace);

            // Update associated paiement record if exists
            Paiement::where('appel_fonds_ligne_id', $ligne->id)
                ->update([
                    'penalty_amount' => $penalty,
                    'penalty_calculated_at' => now(),
                ]);
        }

        Log::info("PenaltyCalculatorJob: processed residence {$config->residence_id}, {$impayesLignes->count()} lines checked");
    }

    protected function calculatePenalty(PenaltyConfig $config, float $montantImpaye, int $daysOverGrace): float
    {
        $penalty = match ($config->rate_type) {
            'fixed' => $config->rate_value,
            'percentage' => $montantImpaye * ($config->rate_value / 100),
            'daily' => $config->rate_value * $daysOverGrace,
            default => 0,
        };

        if ($config->cap_max_montant && $penalty > $config->cap_max_montant) {
            $penalty = $config->cap_max_montant;
        }

        return round($penalty, 2);
    }
}
