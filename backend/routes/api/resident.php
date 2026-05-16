<?php

use App\Http\Controllers\Api\Resident\PortailAnnonceController;
use App\Http\Controllers\Api\Resident\PortailAssembleeController;
use App\Http\Controllers\Api\Resident\PortailDashboardController;
use App\Http\Controllers\Api\Resident\PortailDocumentController;
use App\Http\Controllers\Api\Resident\PortailOperationsController;
use App\Http\Controllers\Api\Resident\PortailProfilController;
use App\Http\Controllers\Api\Resident\PortailReclamationController;
use Illuminate\Support\Facades\Route;

Route::get('/dashboard',    PortailDashboardController::class);
Route::get('/operations',   PortailOperationsController::class);
Route::get('/annonces',     PortailAnnonceController::class);
Route::get('/assemblees',   PortailAssembleeController::class);
Route::get('/documents',    PortailDocumentController::class);

Route::get('/reclamations',  [PortailReclamationController::class, 'index']);
Route::post('/reclamations', [PortailReclamationController::class, 'store']);

Route::get('/profil',  [PortailProfilController::class, 'show']);
Route::put('/profil',  [PortailProfilController::class, 'update']);
