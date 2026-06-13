<?php

namespace App\Http\Controllers\Api\Resident;

use App\Http\Controllers\Controller;
use App\Models\Lot;
use App\Models\Residence;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Contrat front : ResidentProfile = { name, phone, lot:string, residence:string, email? }
 * (lot et residence sont des chaînes, pas des objets.)
 */
class PortailProfilController extends Controller
{
    public function show(Request $request): JsonResponse
    {
        return response()->json([
            'status' => 'success',
            'data' => $this->profile($request->user()),
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
            'data' => $this->profile($request->user()->fresh()),
        ]);
    }

    /** Forme aplatie attendue par le front. */
    private function profile(User $user): array
    {
        $copro = $user->coproprietaire;

        // Résolu sans le scope tenant : le lot/résidence du copro doit toujours
        // s'afficher, même si le contexte tenant de la requête n'est pas posé.
        $lot = $copro?->lot_id ? Lot::withoutGlobalScope('tenant')->find($copro->lot_id) : null;
        $residence = $lot ? Residence::withoutGlobalScope('tenant')->find($lot->residence_id) : null;

        return [
            'name' => $user->name,
            'phone' => $user->phone,
            'email' => $user->email,
            'lot' => $lot?->numero ?? '—',
            'residence' => $residence?->name ?? '—',
        ];
    }
}
