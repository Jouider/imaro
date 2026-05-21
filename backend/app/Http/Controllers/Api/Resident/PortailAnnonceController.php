<?php

namespace App\Http\Controllers\Api\Resident;

use App\Http\Controllers\Controller;
use App\Models\Annonce;
use App\Models\Coproprietaire;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PortailAnnonceController extends Controller
{
    public function __invoke(Request $request): JsonResponse
    {
        $user  = $request->user();
        $copro = $user->coproprietaires()->with('lot')->first();

        $residenceId = $copro?->lot?->residence_id;

        $query = Annonce::where('tenant_id', config('app.tenant_id'))
            ->where('statut', 'publiee');

        if ($residenceId) {
            $query->where(fn ($q) => $q->whereNull('residence_id')->orWhere('residence_id', $residenceId));
        } else {
            $query->whereNull('residence_id');
        }

        $annonces = $query->orderByDesc('publiee_at')->get()
            ->map(fn ($a) => [
                'id'       => $a->id,
                'titre'    => $a->titre,
                'contenu'  => $a->contenu,
                'priorite' => $a->priorite,
                'date'     => $a->publiee_at?->toIso8601String() ?? $a->created_at->toIso8601String(),
            ]);

        return response()->json([
            'status' => 'success',
            'data'   => ['annonces' => $annonces],
        ]);
    }
}
