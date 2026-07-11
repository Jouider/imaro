<?php

use App\Http\Controllers\Api\SuperAdmin\MetricsController;
use App\Http\Controllers\Api\SuperAdmin\TenantController;
use Illuminate\Support\Facades\Route;

/*
 * Back-office Digitoyou (role:super_admin, préfixe /api/admin).
 */

// Métriques globales (dashboard back-office)
Route::get('/metrics', MetricsController::class);

// Clients (cabinets syndic = tenants)
Route::get('/tenants', [TenantController::class, 'index']);
Route::get('/tenants/{tenant}', [TenantController::class, 'show']);
Route::put('/tenants/{tenant}', [TenantController::class, 'update']);
Route::post('/tenants/{tenant}/suspend', [TenantController::class, 'suspend']);
Route::post('/tenants/{tenant}/activate', [TenantController::class, 'activate']);
Route::post('/tenants/{tenant}/extend-trial', [TenantController::class, 'extendTrial']);
