<?php

namespace App\Providers;

use App\Models\ComplianceCalendarTask;
use App\Models\LigneBudget;
use App\Services\OtpService;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->app->singleton(OtpService::class);
    }

    public function boot(): void
    {
        Route::model('ligne', LigneBudget::class);
        Route::model('task', ComplianceCalendarTask::class);
    }
}
