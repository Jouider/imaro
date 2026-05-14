<?php

use App\Http\Controllers\Api\Gestionnaire\AppelFondsController;
use App\Http\Controllers\Api\Gestionnaire\CoproprietaireController;
use App\Http\Controllers\Api\Gestionnaire\DashboardController;
use App\Http\Controllers\Api\Gestionnaire\ExerciceController;
use App\Http\Controllers\Api\Gestionnaire\ImpayeController;
use App\Http\Controllers\Api\Gestionnaire\LotController;
use App\Http\Controllers\Api\Gestionnaire\PaiementController;
use App\Http\Controllers\Api\Gestionnaire\ResidenceController;
use App\Http\Controllers\Api\Gestionnaire\TicketController;
use Illuminate\Support\Facades\Route;

// Dashboard
Route::get('/dashboard', [DashboardController::class, 'index']);

// Résidences + lots + copropriétaires + exercices (KAN-13)
Route::apiResource('residences', ResidenceController::class)->only(['index', 'show', 'update']);

Route::prefix('residences/{residence}')->group(function () {
    Route::get('/lots', [LotController::class, 'index']);
    Route::post('/lots', [LotController::class, 'store']);
    Route::put('/lots/{lot}', [LotController::class, 'update']);
    Route::delete('/lots/{lot}', [LotController::class, 'destroy']);
    Route::get('/coproprietaires', [CoproprietaireController::class, 'index']);
    // Exercices
    Route::get('/exercices', [ExerciceController::class, 'index']);
    Route::post('/exercices', [ExerciceController::class, 'store']);
    Route::post('/exercices/{exercice}/cloture', [ExerciceController::class, 'cloture']);
});

// Appels de fonds (KAN-14)
Route::apiResource('appels-fonds', AppelFondsController::class)
    ->only(['index', 'store', 'show', 'update'])
    ->parameters(['appels-fonds' => 'appelFonds']);
Route::post('appels-fonds/{appelFonds}/envoyer', [AppelFondsController::class, 'envoyer']);

// Paiements + impayés (KAN-15)
Route::get('/paiements', [PaiementController::class, 'index']);
Route::post('/paiements', [PaiementController::class, 'store']);
Route::get('/impayes', [ImpayeController::class, 'index']);

// Tickets (KAN-21)
Route::apiResource('tickets', TicketController::class)->only(['index', 'store', 'show', 'update']);
Route::post('tickets/{ticket}/clos', [TicketController::class, 'clos']);
