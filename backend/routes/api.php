<?php

use App\Http\Controllers\Api\Auth\AuthController;
use App\Http\Controllers\Api\Public\VisitePublicController;
use App\Http\Controllers\Api\VisiteScanController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Routes publiques (sans auth)
|--------------------------------------------------------------------------
*/

Route::prefix('auth')->group(function () {
    // Admin (manager, gestionnaire, conseil, super_admin) — email + password
    Route::post('/login', [AuthController::class, 'login']);
    Route::post('/activate', [AuthController::class, 'activate']);

    // Résident (portail mobile) — téléphone + code
    Route::post('/resident/login', [AuthController::class, 'residentLogin']);
    Route::post('/resident/activate', [AuthController::class, 'residentActivate']);
});

// Laissez-passer visiteur — page publique /v/:token (KAN-102, AUCUNE auth)
Route::get('/public/visites/{token}', [VisitePublicController::class, 'show']);
Route::get('/public/visites/{token}/wallet', [VisitePublicController::class, 'wallet']);

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

    // Gestionnaire (accessible par manager aussi)
    Route::middleware('role:manager|gestionnaire')
        ->prefix('gestionnaire')
        ->group(base_path('routes/api/gestionnaire.php'));

    // Alias routes — conformite.service.ts calls without /gestionnaire/ prefix
    Route::middleware('role:manager|gestionnaire')->group(function () {
        $ns = 'App\\Http\\Controllers\\Api\\Gestionnaire';
        Route::get('/audit-logs', [$ns.'\\AuditLogController', 'index']);
        Route::get('/audit-logs/export', [$ns.'\\AuditLogController', 'export']);
        Route::get('/lots/{lot}/occupants', [$ns.'\\OccupantController', 'index']);
        Route::post('/lots/{lot}/occupants', [$ns.'\\OccupantController', 'store']);
        Route::prefix('residences/{residence}')->group(function () use ($ns) {
            Route::get('/annexes', [$ns.'\\AnnexeController', 'index']);
            Route::get('/annexes/{annexeNum}', [$ns.'\\AnnexeController', 'show']);
            Route::post('/annexes/{annexeNum}/regenerate', [$ns.'\\AnnexeController', 'regenerate']);
            Route::get('/compliance-calendar', [$ns.'\\ComplianceCalendarController', 'index']);
            Route::get('/penalty-config', [$ns.'\\PenaltyController', 'show']);
            Route::put('/penalty-config', [$ns.'\\PenaltyController', 'update']);
            Route::post('/penalties/recalculate', [$ns.'\\PenaltyController', 'recalculate']);
            Route::get('/recouvrement', [$ns.'\\RecouvrementController', 'index']);
            Route::get('/occupants', [$ns.'\\OccupantController', 'indexByResidence']);
        });
        Route::post('/compliance-tasks/{task}/complete', [$ns.'\\ComplianceCalendarController', 'complete']);
        Route::post('/compliance-tasks/{task}/skip', [$ns.'\\ComplianceCalendarController', 'skip']);
        Route::post('/paiements/{paiement}/mise-en-demeure', [$ns.'\\PenaltyController', 'miseEnDemeure']);

        // Alias — equipe.service.ts calls /equipe/* without /gestionnaire/ prefix
        Route::middleware('app.permission:personnel')->group(function () use ($ns) {
            Route::get('/equipe/utilisateurs', [$ns.'\\EquipeUtilisateurController', 'index']);
            Route::post('/equipe/utilisateurs', [$ns.'\\EquipeUtilisateurController', 'store']);
            Route::put('/equipe/utilisateurs/{id}', [$ns.'\\EquipeUtilisateurController', 'update']);
            Route::delete('/equipe/utilisateurs/{id}', [$ns.'\\EquipeUtilisateurController', 'destroy']);
            Route::get('/equipe/personnel', [$ns.'\\EquipePersonnelController', 'index']);
            Route::post('/equipe/personnel', [$ns.'\\EquipePersonnelController', 'store']);
            Route::put('/equipe/personnel/{id}', [$ns.'\\EquipePersonnelController', 'update']);
            Route::delete('/equipe/personnel/{id}', [$ns.'\\EquipePersonnelController', 'destroy']);
        });
    });

    // Agent recouvrement
    Route::middleware('role:agent_recouvrement')
        ->prefix('agent')
        ->group(base_path('routes/api/agent.php'));

    // Conseil syndical
    Route::middleware('role:conseil')
        ->prefix('conseil')
        ->group(base_path('routes/api/conseil.php'));

    // Résident (portail copropriétaire)
    Route::middleware('role:resident')
        ->prefix('portail')
        ->group(base_path('routes/api/resident.php'));

    // Scan QR + walk-in + visiteurs actifs — gardien/personnel (override gestionnaire/manager) (KAN-102)
    Route::middleware('role:personnel|gestionnaire|manager')->group(function () {
        Route::post('/visites/scan', [VisiteScanController::class, 'scan']);
        Route::post('/visites/walk-in', [VisiteScanController::class, 'walkIn']);
        Route::get('/gardien/visites/active', [VisiteScanController::class, 'active']);
    });
});
