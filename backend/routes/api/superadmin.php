<?php

use App\Http\Controllers\Api\SuperAdmin\LeadController;
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

// Démos & leads (pipeline commercial)
Route::get('/leads', [LeadController::class, 'index']);
Route::post('/leads', [LeadController::class, 'store']);
Route::get('/leads/{lead}', [LeadController::class, 'show']);
Route::put('/leads/{lead}', [LeadController::class, 'update']);
Route::delete('/leads/{lead}', [LeadController::class, 'destroy']);
Route::post('/leads/{lead}/convertir', [LeadController::class, 'convertir']);
