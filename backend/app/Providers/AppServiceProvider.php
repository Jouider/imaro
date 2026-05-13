<?php

namespace App\Providers;

use App\Services\OtpService;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->app->singleton(OtpService::class);
    }

    public function boot(): void {}
}
