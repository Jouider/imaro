<?php

namespace App\Console\Commands;

use App\Models\Visite;
use Illuminate\Console\Command;

/**
 * Passe à `expired` les visites planifiées jamais honorées (>24h sans check-in).
 * Sinon le KPI `expired_today` ne se remplit jamais (cf. brief Visites).
 */
class ExpireVisitesCommand extends Command
{
    protected $signature = 'visites:expire';

    protected $description = 'Expire les visites planifiées dépassées (>24h sans arrivée).';

    public function handle(): int
    {
        $count = Visite::withoutGlobalScope('tenant')
            ->where('status', 'planned')
            ->whereNull('arrived_at')
            ->where('is_recurring', false)
            ->where('planned_at', '<', now()->subDay())
            ->update(['status' => 'expired']);

        $this->info("Visites expirées : {$count}");

        return self::SUCCESS;
    }
}
