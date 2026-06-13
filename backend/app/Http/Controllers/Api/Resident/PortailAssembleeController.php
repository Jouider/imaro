<?php

namespace App\Http\Controllers\Api\Resident;

use App\Http\Controllers\Controller;
use App\Models\Assemblee;
use App\Models\Lot;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PortailAssembleeController extends Controller
{
    public function __invoke(Request $request): JsonResponse
    {
        $user = $request->user();
        $lotId = $user->coproprietaire?->lot_id;
        $residenceId = $lotId ? Lot::withoutGlobalScope('tenant')->find($lotId)?->residence_id : null;

        $assemblees = Assemblee::where('tenant_id', $user->tenant_id)   // tenant de l'utilisateur (robuste)
            ->where(function ($q) use ($residenceId) {
                $q->whereNull('residence_id');
                if ($residenceId) {
                    $q->orWhere('residence_id', $residenceId);
                }
            })
            ->orderByDesc('date')->get()
            ->map(fn ($a) => [
                'id' => $a->id, 'titre' => $a->titre, 'date' => $a->date?->toDateString(),
                'lieu' => $a->lieu, 'statut' => $a->statut,
            ]);

        return response()->json(['status' => 'success', 'data' => $assemblees]);
    }
}
