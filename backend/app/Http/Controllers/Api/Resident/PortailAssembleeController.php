<?php

namespace App\Http\Controllers\Api\Resident;

use App\Http\Controllers\Controller;
use App\Models\Assemblee;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PortailAssembleeController extends Controller
{
    public function __invoke(Request $request): JsonResponse
    {
        $assemblees = Assemblee::where('tenant_id', config('app.tenant_id'))
            ->orderByDesc('date')->get()
            ->map(fn ($a) => [
                'id' => $a->id, 'titre' => $a->titre, 'date' => $a->date?->toDateString(),
                'lieu' => $a->lieu, 'statut' => $a->statut,
            ]);

        return response()->json(['status' => 'success', 'data' => $assemblees]);
    }
}
