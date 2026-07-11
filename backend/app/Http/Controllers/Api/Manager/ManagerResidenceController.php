<?php

namespace App\Http\Controllers\Api\Manager;

use App\Http\Controllers\Controller;
use App\Models\Residence;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class ManagerResidenceController extends Controller
{
    /**
     * GET /api/manager/residences — list all residences for this tenant
     */
    public function index(Request $request): JsonResponse
    {
        $tenantId = config('app.tenant_id');

        $residences = Residence::where('tenant_id', $tenantId)
            ->withCount(['lots', 'coproprietaires'])
            ->with('gestionnaire:id,name,email')
            ->orderBy('name')
            ->get()
            ->map(fn ($r) => [
                'id'                    => $r->id,
                'name'                  => $r->name,
                'adresse'               => $r->address,
                'ville'                 => $r->city,
                'nb_lots'               => $r->lots_count,
                'nb_coproprietaires'    => $r->coproprietaires_count,
                'gestionnaire_id'       => $r->gestionnaire_id,
                'gestionnaire_nom'      => $r->gestionnaire?->name,
                'statut'                => $r->status ?? 'actif',
                'created_at'            => $r->created_at?->toDateString(),
            ]);

        return response()->json([
            'status' => 'success',
            'data'   => $residences,
        ]);
    }

    /**
     * POST /api/manager/residences — create new residence
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name'              => 'required|string|max:255',
            'address'           => 'required|string|max:500',
            'city'              => 'required|string|max:100',
            'gestionnaire_id'   => 'nullable|exists:users,id',
        ]);

        $residence = Residence::create([
            'tenant_id'        => config('app.tenant_id'),
            'name'             => $validated['name'],
            'address'          => $validated['address'],
            'city'             => $validated['city'],
            'gestionnaire_id'  => $validated['gestionnaire_id'] ?? null,
        ]);

        return response()->json([
            'status'  => 'success',
            'message' => 'Résidence créée.',
            'data'    => $residence,
        ], 201);
    }

    /**
     * PUT /api/manager/residences/{residence} — update residence
     */
    public function update(Request $request, Residence $residence): JsonResponse
    {
        $validated = $request->validate([
            'name'              => 'sometimes|string|max:255',
            'address'           => 'sometimes|string|max:500',
            'city'              => 'sometimes|string|max:100',
            'gestionnaire_id'   => 'nullable|exists:users,id',
        ]);

        $residence->update($validated);

        return response()->json([
            'status'  => 'success',
            'message' => 'Résidence mise à jour.',
            'data'    => $residence->fresh(),
        ]);
    }

    /**
     * DELETE /api/manager/residences/{residence}
     */
    public function destroy(Residence $residence): JsonResponse
    {
        $residence->delete();

        return response()->json([
            'status'  => 'success',
            'message' => 'Résidence supprimée.',
        ]);
    }
}
