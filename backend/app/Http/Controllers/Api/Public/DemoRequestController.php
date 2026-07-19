<?php

namespace App\Http\Controllers\Api\Public;

use App\Http\Controllers\Controller;
use App\Models\Lead;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Demande de démo depuis le site vitrine (public, sans auth) — KAN-138.
 * Crée un lead « nouveau » dans le pipeline commercial du back-office.
 * Débit limité (throttle) au niveau de la route pour éviter le spam.
 */
class DemoRequestController extends Controller
{
    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'cabinet' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255'],
            'phone' => ['required', 'string', 'max:30'],
            'message' => ['nullable', 'string', 'max:2000'],
        ]);

        Lead::create([
            'cabinet_nom' => $data['cabinet'],
            'contact_nom' => $data['name'],
            'contact_email' => $data['email'],
            'contact_telephone' => $data['phone'],
            'source' => 'site',
            'statut' => 'nouveau',
            'notes' => $data['message'] ?? null,
        ]);

        return response()->json([
            'status' => 'success',
            'message' => 'Demande de démo enregistrée. Notre équipe vous recontacte rapidement.',
        ], 201);
    }
}
