<?php

use App\Http\Controllers\Api\Resident\PortailAnnonceController;
use App\Http\Controllers\Api\Resident\PortailAssembleeController;
use App\Http\Controllers\Api\Resident\PortailBankAccountController;
use App\Http\Controllers\Api\Resident\PortailDashboardController;
use App\Http\Controllers\Api\Resident\PortailDocumentController;
use App\Http\Controllers\Api\Resident\PortailOperationsController;
use App\Http\Controllers\Api\Resident\PortailPaiementController;
use App\Http\Controllers\Api\Resident\PortailPaiementOnlineController;
use App\Http\Controllers\Api\Resident\PortailProfilController;
use App\Http\Controllers\Api\Resident\PortailPushController;
use App\Http\Controllers\Api\Resident\PortailReclamationController;
use App\Http\Controllers\Api\Resident\PortailVisiteController;
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

// Visiteurs attendus + QR (KAN-102)
Route::get('/visites',         [PortailVisiteController::class, 'index']);
Route::post('/visites',        [PortailVisiteController::class, 'store']);
Route::delete('/visites/{id}', [PortailVisiteController::class, 'destroy']);

Route::get('/comptes-bancaires', PortailBankAccountController::class);
Route::post('/paiements',        [PortailPaiementController::class, 'store']);
// Paiement en ligne (passerelle) — KAN-72 / #251 ; le retour est public (cf. web.php)
Route::post('/paiement/initier', [PortailPaiementOnlineController::class, 'initier']);

Route::post('/push/subscribe',   [PortailPushController::class, 'subscribe']);
Route::delete('/push/unsubscribe', [PortailPushController::class, 'unsubscribe']);
// Push natif mobile (FCM/APNs) — KAN-68
Route::post('/push/register-device',   [PortailPushController::class, 'registerDevice']);
Route::delete('/push/register-device', [PortailPushController::class, 'unregisterDevice']);
