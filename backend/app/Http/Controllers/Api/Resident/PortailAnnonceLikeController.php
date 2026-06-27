<?php

namespace App\Http\Controllers\Api\Resident;

use App\Http\Controllers\Controller;
use App\Models\Annonce;
use App\Models\AnnonceLike;
use App\Models\Lot;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * KAN-96 — POST /api/portail/annonces/{annonce}/like
 *
 * Toggle idempotent du « j'aime » du résident courant sur une annonce.
 * Body: { "liked": bool } — l'état souhaité.
 */
class PortailAnnonceLikeController extends Controller
{
    public function __invoke(Request $request, Annonce $annonce): JsonResponse
    {
        $validated = $request->validate([
            'liked' => ['required', 'boolean'],
        ]);

        $user = $request->user();

        // Annonce n'a pas de scope tenant global : on vérifie ici que l'annonce
        // est bien visible par ce résident (même tenant, publiée, sa résidence
        // ou globale).
        abort_unless($this->isVisibleTo($annonce, $user), 404);

        if ($validated['liked']) {
            AnnonceLike::firstOrCreate([
                'annonce_id' => $annonce->id,
                'user_id'    => $user->id,
            ]);
        } else {
            AnnonceLike::where('annonce_id', $annonce->id)
                ->where('user_id', $user->id)
                ->delete();
        }

        return response()->json([
            'status' => 'success',
            'data'   => [
                'likes_count' => $annonce->likes()->count(),
                'liked'       => $annonce->likes()->where('user_id', $user->id)->exists(),
            ],
        ]);
    }

    private function isVisibleTo(Annonce $annonce, User $user): bool
    {
        if ($annonce->tenant_id !== $user->tenant_id || $annonce->statut !== 'publiee') {
            return false;
        }

        if ($annonce->residence_id === null) {
            return true; // annonce globale
        }

        $lotId = $user->coproprietaire?->lot_id;
        $residenceId = $lotId ? Lot::withoutGlobalScope('tenant')->find($lotId)?->residence_id : null;

        return $annonce->residence_id === $residenceId;
    }
}
