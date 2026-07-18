<?php

use App\Http\Controllers\Api\SuperAdmin\AuditController;
use App\Http\Controllers\Api\SuperAdmin\BillingController;
use App\Http\Controllers\Api\SuperAdmin\ClientOverviewController;
use App\Http\Controllers\Api\SuperAdmin\HealthController;
use App\Http\Controllers\Api\SuperAdmin\LeadController;
use App\Http\Controllers\Api\SuperAdmin\MetricsController;
use App\Http\Controllers\Api\SuperAdmin\PlanController;
use App\Http\Controllers\Api\SuperAdmin\TenantController;
use App\Http\Controllers\Api\SuperAdmin\UserController;
use Illuminate\Support\Facades\Route;

/*
 * Back-office Digitoyou (role:super_admin, préfixe /api/admin).
 */

// Métriques globales (dashboard back-office)
Route::get('/metrics', MetricsController::class);

// Clients (cabinets syndic = tenants)
Route::get('/tenants', [TenantController::class, 'index']);
Route::get('/tenants/{tenant}', [TenantController::class, 'show']);
// Vue 360° — activité complète du cabinet (usagers, parc, réclamations, finances, abonnement)
Route::get('/tenants/{tenant}/overview', ClientOverviewController::class);
Route::get('/tenants/{tenant}/activity', [TenantController::class, 'activity']);
Route::put('/tenants/{tenant}', [TenantController::class, 'update']);
Route::post('/tenants/{tenant}/suspend', [TenantController::class, 'suspend']);
Route::post('/tenants/{tenant}/activate', [TenantController::class, 'activate']);
Route::post('/tenants/{tenant}/extend-trial', [TenantController::class, 'extendTrial']);
// Impersonation (dépannage) — token court tracé dans l'audit
Route::post('/tenants/{tenant}/impersonate', [TenantController::class, 'impersonate']);

// Supervision technique (santé, files, jobs en échec) — KAN-143
Route::get('/health', [HealthController::class, 'health']);
Route::get('/failed-jobs', [HealthController::class, 'failedJobs']);
Route::post('/failed-jobs/{id}/retry', [HealthController::class, 'retry']);

// Abonnements & facturation (KAN-140)
Route::get('/invoices', [BillingController::class, 'index']);
Route::post('/tenants/{tenant}/invoices', [BillingController::class, 'store']);
Route::put('/tenants/{tenant}/subscription', [BillingController::class, 'updateSubscription']);
Route::post('/invoices/{invoice}/mark-paid', [BillingController::class, 'markPaid']);
Route::post('/invoices/{invoice}/cancel', [BillingController::class, 'cancel']);

// Plans commerciaux (offres, tarifs, quotas) — KAN-146
Route::get('/plans', [PlanController::class, 'index']);
Route::post('/plans', [PlanController::class, 'store']);
Route::put('/plans/{plan}', [PlanController::class, 'update']);
Route::delete('/plans/{plan}', [PlanController::class, 'destroy']);

// Journal d'audit global cross-tenant (sécurité) — KAN-144
Route::get('/audit', [AuditController::class, 'index']);
Route::get('/audit/export', [AuditController::class, 'export']);

// Gestion globale des utilisateurs (cross-tenant, support) — KAN-141
Route::get('/users', [UserController::class, 'index']);
Route::post('/users/{user}/reset-password', [UserController::class, 'resetPassword']);
Route::post('/users/{user}/toggle', [UserController::class, 'toggle']);
Route::post('/users/{user}/logout', [UserController::class, 'forceLogout']);

// Démos & leads (pipeline commercial)
Route::get('/leads', [LeadController::class, 'index']);
Route::post('/leads', [LeadController::class, 'store']);
Route::get('/leads/{lead}', [LeadController::class, 'show']);
Route::put('/leads/{lead}', [LeadController::class, 'update']);
Route::delete('/leads/{lead}', [LeadController::class, 'destroy']);
Route::post('/leads/{lead}/convertir', [LeadController::class, 'convertir']);
