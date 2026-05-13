<?php

use App\Http\Controllers\Api\Gestionnaire\CoproprietaireController;
use App\Http\Controllers\Api\Gestionnaire\DashboardController;
use App\Http\Controllers\Api\Gestionnaire\LotController;
use App\Http\Controllers\Api\Gestionnaire\ResidenceController;
use Illuminate\Support\Facades\Route;

Route::get('/dashboard', [DashboardController::class, 'index']);

Route::apiResource('residences', ResidenceController::class)->only(['index', 'show', 'update']);

Route::prefix('residences/{residence}')->group(function () {
    Route::get('/lots', [LotController::class, 'index']);
    Route::post('/lots', [LotController::class, 'store']);
    Route::put('/lots/{lot}', [LotController::class, 'update']);
    Route::delete('/lots/{lot}', [LotController::class, 'destroy']);

    Route::get('/coproprietaires', [CoproprietaireController::class, 'index']);
});
