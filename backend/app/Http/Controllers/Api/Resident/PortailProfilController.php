<?php

namespace App\Http\Controllers\Api\Resident;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PortailProfilController extends Controller
{
    public function show(Request $request): JsonResponse
    {
        $user = $request->user();
        $copro = $user->coproprietaire;

        return response()->json([
            'status' => 'success',
            'data'   => [
                'id' => $user->id, 'name' => $user->name,
                'email' => $user->email, 'phone' => $user->phone,
                'lot' => $copro?->lot ? [
                    'numero' => $copro->lot->numero, 'etage' => $copro->lot->etage,
                    'type' => $copro->lot->type, 'tantieme' => $copro->lot->tantieme,
                ] : null,
                'residence' => $copro?->lot?->residence ? [
                    'id' => $copro->lot->residence->id, 'name' => $copro->lot->residence->name,
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
