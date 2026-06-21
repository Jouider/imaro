<?php

use App\Http\Controllers\Api\Personnel\PersonnelVisiteController;
use Illuminate\Support\Facades\Route;

// Contrôle des visiteurs par QR (KAN-102)
Route::get('/visites', [PersonnelVisiteController::class, 'index']);
Route::post('/visites/scan', [PersonnelVisiteController::class, 'scan']);
