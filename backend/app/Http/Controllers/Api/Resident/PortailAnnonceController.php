<?php

namespace App\Http\Controllers\Api\Resident;

use App\Http\Controllers\Controller;
use App\Models\Annonce;
use App\Models\Lot;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PortailAnnonceController extends Controller
{
    public function __invoke(Request $request): JsonResponse
    {
        $user = $request->user();
        $residenceId = $this->residentResidenceId($user);

        $annonces = Annonce::where('tenant_id', $user->tenant_id)   // tenant de l'utilisateur (robuste)
            ->where('statut', 'publiee')                            // l'enum est "publiee" (pas "publie")
            ->where(function ($q) use ($residenceId) {              // annonces de sa résidence + globales
                $q->whereNull('residence_id');
                if ($residenceId) {
                    $q->orWhere('residence_id', $residenceId);
                }
            })
            ->orderByDesc('publiee_at')->orderByDesc('created_at')->get()
            ->map(fn ($a) => [
                'id' => $a->id, 'titre' => $a->titre, 'contenu' => $a->contenu,
                'type' => $a->priorite === 'urgente' ? 'urgent' : 'info',
                'date' => ($a->publiee_at ?? $a->created_at)?->toDateString(),
            ]);

        return response()->json(['status' => 'success', 'data' => $annonces]);
    }

    private function residentResidenceId(User $user): ?int
    {
        $lotId = $user->coproprietaire?->lot_id;

        return $lotId ? Lot::withoutGlobalScope('tenant')->find($lotId)?->residence_id : null;
    }
}
