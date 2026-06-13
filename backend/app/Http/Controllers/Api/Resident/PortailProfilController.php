<?php

namespace App\Http\Controllers\Api\Resident;

use App\Http\Controllers\Controller;
use App\Models\Lot;
use App\Models\Residence;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PortailProfilController extends Controller
{
    public function show(Request $request): JsonResponse
    {
        $user = $request->user();
        $copro = $user->coproprietaire;

        // Résolu sans le scope tenant : le lot/résidence du copro doit toujours
        // s'afficher, même si le contexte tenant de la requête n'est pas posé.
        $lot = $copro?->lot_id ? Lot::withoutGlobalScope('tenant')->find($copro->lot_id) : null;
        $residence = $lot ? Residence::withoutGlobalScope('tenant')->find($lot->residence_id) : null;

        return response()->json([
            'status' => 'success',
            'data'   => [
                'id' => $user->id, 'name' => $user->name,
                'email' => $user->email, 'phone' => $user->phone,
                'lot' => $lot ? [
                    'numero' => $lot->numero, 'etage' => $lot->etage,
                    'type' => $lot->type, 'tantieme' => $lot->tantieme,
                ] : null,
                'residence' => $residence ? [
                    'id' => $residence->id, 'name' => $residence->name,
                ] : null,
            ],
        ]);
    }

    public function update(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'email' => 'sometimes|email|max:255',
            'phone' => 'sometimes|string|max:20',
        ]);

        $request->user()->update($validated);

        return response()->json([
            'status' => 'success', 'message' => 'Profil mis à jour.',
            'data' => $request->user()->fresh(),
        ]);
    }
}
