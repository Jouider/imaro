<?php

use App\Http\Controllers\Api\Auth\AuthController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Routes publiques (sans auth)
|--------------------------------------------------------------------------
*/

Route::prefix('auth')->group(function () {
    Route::post('/request-otp', [AuthController::class, 'requestOtp']);
    Route::post('/verify-otp', [AuthController::class, 'verifyOtp']);
});

/*
|--------------------------------------------------------------------------
| Routes protégées (Sanctum auth requis)
|--------------------------------------------------------------------------
*/

Route::middleware('auth:sanctum')->group(function () {

    Route::get('/auth/me', [AuthController::class, 'me']);
    Route::post('/auth/logout', [AuthController::class, 'logout']);

    // Super Admin
    Route::middleware('role:super_admin')
        ->prefix('admin')
        ->group(base_path('routes/api/superadmin.php'));

    // Manager
    Route::middleware('role:manager')
        ->prefix('manager')
        ->group(base_path('routes/api/manager.php'));

    // Gestionnaire
    Route::middleware('role:gestionnaire')
        ->prefix('gestionnaire')
        ->group(base_path('routes/api/gestionnaire.php'));

    // Agent recouvrement
    Route::middleware('role:agent_recouvrement')
        ->prefix('agent')
        ->group(base_path('routes/api/agent.php'));

    // Conseil syndical
    Route::middleware('role:conseil')
        ->prefix('conseil')
        ->group(base_path('routes/api/conseil.php'));

    // Résident (portail mobile)
    Route::middleware('role:resident')
        ->prefix('resident')
        ->group(base_path('routes/api/resident.php'));
});
