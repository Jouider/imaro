<?php

namespace App\Http\Controllers\Api\Gestionnaire;

use App\Http\Controllers\Controller;
use App\Http\Requests\Gestionnaire\UpdateResidenceRequest;
use App\Http\Resources\ResidenceResource;
use App\Models\Residence;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ResidenceController extends Controller
{
    /**
     * GET /api/gestionnaire/residences
     * Lists only residences assigned to the authenticated gestionnaire.
     */
    public function index(Request $request): JsonResponse
    {
        $query = Residence::where('gestionnaire_id', $request->user()->id)
            ->with(['gestionnaire', 'exercices'])
            ->withCount('lots');

        if ($search = $request->search) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('city', 'like', "%{$search}%");
            });
        }

        $residences = $query->paginate($request->integer('per_page', 15));

        return response()->json([
            'status' => 'success',
            'data' => [
                'residences' => ResidenceResource::collection($residences),
                'meta' => [
                    'total' => $residences->total(),
                    'per_page' => $residences->perPage(),
                    'current_page' => $residences->currentPage(),
                    'last_page' => $residences->lastPage(),
                ],
            ],
        ]);
    }

    /**
     * GET /api/gestionnaire/residences/{residence}
     */
    public function show(Request $request, Residence $residence): JsonResponse
    {
        $this->authorizeResidence($request, $residence);

        $residence->load(['gestionnaire', 'exercices', 'lots.coproprietairePrincipal.user']);

        return response()->json([
            'status' => 'success',
            'data' => ['residence' => new ResidenceResource($residence)],
        ]);
    }

    /**
     * PUT /api/gestionnaire/residences/{residence}
     */
    public function update(UpdateResidenceRequest $request, Residence $residence): JsonResponse
    {
        $this->authorizeResidence($request, $residence);

        $residence->update($request->validated());

        return response()->json([
            'status' => 'success',
            'message' => 'Résidence mise à jour',
            'data' => ['residence' => new ResidenceResource($residence->fresh('gestionnaire'))],
        ]);
    }

    private function authorizeResidence(Request $request, Residence $residence): void
    {
        abort_if(
            $residence->gestionnaire_id !== $request->user()->id,
            403,
            'Cette résidence ne vous est pas assignée.'
        );
    }
}
