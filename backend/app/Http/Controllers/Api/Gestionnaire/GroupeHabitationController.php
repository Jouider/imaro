<?php

namespace App\Http\Controllers\Api\Gestionnaire;

use App\Http\Controllers\Controller;
use App\Http\Resources\GroupeHabitationResource;
use App\Models\GroupeHabitation;
use App\Models\Residence;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class GroupeHabitationController extends Controller
{
    use Concerns\AuthorizesResidence;

    public function index(Request $request, Residence $residence): JsonResponse
    {
        $this->authorizeResidence($request, $residence);

        $groupes = $residence->groupesHabitations()->with('immeubles')->get();

        return response()->json([
            'status' => 'success',
            'data'   => ['groupes_habitations' => GroupeHabitationResource::collection($groupes)],
        ]);
    }

    public function store(Request $request, Residence $residence): JsonResponse
    {
        $this->authorizeResidence(request(), $residence);

        $data = $request->validate([
            'nom'            => 'required|string|max:255',
            'description'    => 'nullable|string',
            'total_tantieme' => 'nullable|numeric|min:1',
        ]);

        if ($residence->groupesHabitations()->where('nom', $data['nom'])->exists()) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Un groupe avec ce nom existe déjà dans cette résidence.',
            ], 422);
        }

        $groupe = GroupeHabitation::create([
            'tenant_id'      => config('app.tenant_id'),
            'residence_id'   => $residence->id,
            'nom'            => $data['nom'],
            'description'    => $data['description'] ?? null,
            'total_tantieme' => $data['total_tantieme'] ?? 1000,
        ]);

        return response()->json([
            'status'  => 'success',
            'message' => 'Groupe d\'habitation créé',
            'data'    => ['groupe_habitation' => new GroupeHabitationResource($groupe)],
        ], 201);
    }

    public function update(Request $request, Residence $residence, GroupeHabitation $groupeHabitation): JsonResponse
    {
        $this->authorizeResidence(request(), $residence);
        abort_if($groupeHabitation->residence_id !== $residence->id, 404);

        $data = $request->validate([
            'nom'            => 'sometimes|string|max:255',
            'description'    => 'nullable|string',
            'total_tantieme' => 'sometimes|numeric|min:1',
        ]);

        $groupeHabitation->update($data);

        return response()->json([
            'status'  => 'success',
            'message' => 'Groupe d\'habitation mis à jour',
            'data'    => ['groupe_habitation' => new GroupeHabitationResource($groupeHabitation)],
        ]);
    }

    public function destroy(Residence $residence, GroupeHabitation $groupeHabitation): JsonResponse
    {
        $this->authorizeResidence(request(), $residence);
        abort_if($groupeHabitation->residence_id !== $residence->id, 404);

        if ($groupeHabitation->immeubles()->exists()) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Impossible de supprimer : ce groupe contient des immeubles.',
            ], 422);
        }

        $groupeHabitation->delete();

        return response()->json(['status' => 'success', 'message' => 'Groupe supprimé']);
    }
}
