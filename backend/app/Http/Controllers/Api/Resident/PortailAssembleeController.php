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
        $user  = $request->user();
        $copro = $user->coproprietaires()->with('lot')->first();

        $residenceId = $copro?->lot?->residence_id;

        $query = Assemblee::where('tenant_id', config('app.tenant_id'));

        if ($residenceId) {
            $query->where('residence_id', $residenceId);
        }

        $assemblees = $query->orderByDesc('date')->get()
            ->map(fn ($a) => [
                'id'             => $a->id,
                'titre'          => $a->titre,
                'type'           => $a->type,
                'date'           => $a->date?->toIso8601String(),
                'lieu'           => $a->lieu,
                'statut'         => $a->statut,
                'quorum_requis'  => $a->quorum_requis,
                'ordre_du_jour'  => $a->ordre_du_jour
                    ? array_values(array_filter(explode("\n", $a->ordre_du_jour), fn ($l) => trim($l) !== ''))
                    : [],
            ]);

        return response()->json([
            'status' => 'success',
            'data'   => ['assemblees' => $assemblees],
        ]);
    }
}
