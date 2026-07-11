<?php

use App\Http\Controllers\Api\Manager\ManagerDashboardController;
use App\Http\Controllers\Api\Manager\ManagerGestionnaireController;
use App\Http\Controllers\Api\Manager\ManagerResidenceController;
use Illuminate\Support\Facades\Route;

// Dashboard
Route::get('/dashboard', ManagerDashboardController::class);

// Résidences CRUD
Route::get('/residences', [ManagerResidenceController::class, 'index']);
Route::post('/residences', [ManagerResidenceController::class, 'store']);
Route::put('/residences/{residence}', [ManagerResidenceController::class, 'update']);
Route::delete('/residences/{residence}', [ManagerResidenceController::class, 'destroy']);
Route::post('/residences/{residence}/assign-gestionnaire', [ManagerGestionnaireController::class, 'assign']);

// Gestionnaires CRUD
Route::get('/gestionnaires', [ManagerGestionnaireController::class, 'index']);
Route::post('/gestionnaires', [ManagerGestionnaireController::class, 'store']);
Route::put('/gestionnaires/{user}', [ManagerGestionnaireController::class, 'update']);
