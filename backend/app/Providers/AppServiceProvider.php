<?php

namespace App\Providers;

use App\Models\ComplianceCalendarTask;
use App\Models\LigneBudget;
use App\Services\Ocr\OcrEngine;
use App\Services\Ocr\TesseractEngine;
use App\Services\OtpService;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->app->singleton(OtpService::class);

        // Moteur OCR offline (Tesseract par défaut). Lié à l'interface pour
        // pouvoir le remplacer (ou le mocker en test) sans toucher aux appelants.
        $this->app->bind(OcrEngine::class, fn () => new TesseractEngine(
            bin: config('services.ocr.tesseract_bin', 'tesseract'),
            langs: config('services.ocr.langs', 'fra+ara+eng'),
            timeout: (int) config('services.ocr.timeout', 25),
        ));
    }

    public function boot(): void
    {
        Route::model('ligne', LigneBudget::class);
        Route::model('task', ComplianceCalendarTask::class);
    }
}
