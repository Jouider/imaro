<?php

use App\Jobs\PenaltyCalculatorJob;
use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// Sprint 4: Nightly penalty recalculation at 02:00
Schedule::job(new PenaltyCalculatorJob)->dailyAt('02:00');

// KAN-102: expire les visites planifiées non honorées (>24h) à 03:00
Schedule::command('visites:expire')->dailyAt('03:00');
