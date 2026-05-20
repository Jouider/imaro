<?php

namespace App\Http\Controllers\Api\Gestionnaire;

use App\Http\Controllers\Api\Gestionnaire\Concerns\AuthorizesResidence;
use App\Http\Controllers\Controller;
use App\Http\Resources\AssembleeResource;
use App\Models\Assemblee;
use App\Models\Residence;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class AssembleeController extends Controller
{
    use AuthorizesResidence;
    public function index(Request $request): JsonResponse
    {
        $residenceIds = $this->accessibleResidenceIds($request);

        $assemblees = Assemblee::with('residence')
            ->where('tenant_id', config('app.tenant_id'))
            ->whereIn('residence_id', $residenceIds)
            ->orderByDesc('date')
            ->get();

        return response()->json([
            'status' => 'success',
            'data'   => ['assemblees' => AssembleeResource::collection($assemblees)],
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'titre'        => 'required|string|max:255',
            'type'         => ['required', Rule::in(['ordinaire', 'extraordinaire'])],
            'residence_id' => 'required|exists:residences,id',
            'date'         => 'required|date',
            'lieu'         => 'nullable|string|max:255',
            'quorum_requis'  => 'nullable|integer|min:1|max:100',
            'ordre_du_jour'  => 'nullable|string',
        ]);

        $assemblee = Assemblee::create([
            'tenant_id'     => config('app.tenant_id'),
            'created_by'    => $request->user()->id,
            'titre'         => $data['titre'],
            'type'          => $data['type'],
            'residence_id'  => $data['residence_id'],
            'date'          => $data['date'],
            'lieu'          => $data['lieu'] ?? null,
            'quorum_requis' => $data['quorum_requis'] ?? 50,
            'ordre_du_jour' => $data['ordre_du_jour'] ?? null,
            'statut'        => 'planifiee',
        ]);

        $assemblee->load('residence');

        return response()->json([
            'status'  => 'success',
            'message' => 'Assemblée créée',
            'data'    => ['assemblee' => new AssembleeResource($assemblee)],
        ], 201);
    }
}
