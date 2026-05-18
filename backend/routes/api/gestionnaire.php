<?php

use App\Http\Controllers\Api\Gestionnaire\AnnonceController;
use App\Http\Controllers\Api\Gestionnaire\AppelFondsController;
use App\Http\Controllers\Api\Gestionnaire\AssembleeController;
use App\Http\Controllers\Api\Gestionnaire\BudgetController;
use App\Http\Controllers\Api\Gestionnaire\ContratController;
use App\Http\Controllers\Api\Gestionnaire\CoproprietaireController;
use App\Http\Controllers\Api\Gestionnaire\DashboardController;
use App\Http\Controllers\Api\Gestionnaire\DocumentController;
use App\Http\Controllers\Api\Gestionnaire\ExerciceController;
use App\Http\Controllers\Api\Gestionnaire\ImpayeController;
use App\Http\Controllers\Api\Gestionnaire\LotController;
use App\Http\Controllers\Api\Gestionnaire\PaiementController;
use App\Http\Controllers\Api\Gestionnaire\PrestataireController;
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

// Lots — routes plates pour PUT/DELETE (attendues par le frontend)
Route::put('/lots/{lot}', [LotController::class, 'updateFlat']);
Route::delete('/lots/{lot}', [LotController::class, 'destroyFlat']);

// Copropriétaires — liste globale (toutes résidences du gestionnaire)
Route::get('/coproprietaires', [CoproprietaireController::class, 'indexGlobal']);
Route::post('/coproprietaires/{coproprietaire}/generate-code', [CoproprietaireController::class, 'generateCode']);

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

// Assemblées (Sprint 2)
Route::get('/assemblees', [AssembleeController::class, 'index']);
Route::post('/assemblees', [AssembleeController::class, 'store']);

// Annonces (Sprint 2)
Route::get('/annonces', [AnnonceController::class, 'index']);
Route::post('/annonces', [AnnonceController::class, 'store']);
Route::put('/annonces/{annonce}', [AnnonceController::class, 'update']);
Route::post('/annonces/{annonce}/publier', [AnnonceController::class, 'publier']);
Route::post('/annonces/{annonce}/archiver', [AnnonceController::class, 'archiver']);
Route::delete('/annonces/{annonce}', [AnnonceController::class, 'destroy']);

// Prestataires + Contrats (Sprint 2)
Route::get('/prestataires', [PrestataireController::class, 'index']);
Route::post('/prestataires', [PrestataireController::class, 'store']);
Route::put('/prestataires/{prestataire}', [PrestataireController::class, 'update']);

Route::get('/contrats', [ContratController::class, 'index']);
Route::post('/contrats', [ContratController::class, 'store']);

// Budgets + Postes budgétaires (Sprint 2)
Route::get('/budgets', [BudgetController::class, 'index']);
Route::post('/budgets', [BudgetController::class, 'store']);
Route::post('/budgets/{budget}/approuver', [BudgetController::class, 'approuver']);
Route::post('/budgets/{budget}/postes', [BudgetController::class, 'storePoste']);
Route::put('/budgets/{budget}/postes/{poste}', [BudgetController::class, 'updatePoste']);
Route::delete('/budgets/{budget}/postes/{poste}', [BudgetController::class, 'destroyPoste']);

// Documents (Sprint 2)
Route::get('/documents', [DocumentController::class, 'index']);
Route::post('/documents', [DocumentController::class, 'store']);
Route::delete('/documents/{document}', [DocumentController::class, 'destroy']);
