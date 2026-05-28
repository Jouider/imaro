<?php

namespace App\Http\Controllers\Api\Resident;

use App\Http\Controllers\Controller;
use App\Models\Annonce;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PortailAnnonceController extends Controller
{
    public function __invoke(Request $request): JsonResponse
    {
        $annonces = Annonce::where('tenant_id', config('app.tenant_id'))
            ->where('statut', 'publie')
            ->orderByDesc('created_at')->get()
            ->map(fn ($a) => [
                'id' => $a->id, 'titre' => $a->titre, 'contenu' => $a->contenu,
                'type' => $a->type ?? 'info', 'date' => $a->created_at?->toDateString(),
            ]);

        return response()->json(['status' => 'success', 'data' => $annonces]);
    }
}
