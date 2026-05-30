<?php

namespace App\Http\Controllers\Api\Gestionnaire;

use App\Http\Controllers\Controller;
use App\Http\Resources\GroupeHabitationResource;
use App\Models\GroupeHabitation;
use App\Models\Residence;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class GroupeHabitationController extends Controller
{
    use Concerns\AuthorizesResidence;

    public function index(Request $request, Residence $residence): JsonResponse
    {
        $this->authorizeResidence($request, $residence);

        $groupes = $residence->groupesHabitations()
            ->withCount('immeubles')
            ->orderBy('nom')
            ->get();

        return response()->json([
            'status' => 'success',
            'data'   => ['groupes_habitations' => GroupeHabitationResource::collection($groupes)],
        ]);
    }

    public function store(Request $request, Residence $residence): JsonResponse
    {
        $this->authorizeResidence($request, $residence);

        $data = $request->validate([
            'nom'            => 'required|string|max:255',
            'code'           => 'nullable|string|max:20',
            'description'    => 'nullable|string',
            'total_tantieme' => 'nullable|numeric|min:1',
        ]);

        if ($residence->groupesHabitations()->where('nom', $data['nom'])->exists()) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Un groupe avec ce nom existe déjà dans cette résidence.',
            ], 422);
        }

        if (! empty($data['code']) && $residence->groupesHabitations()->where('code', $data['code'])->exists()) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Un groupe avec ce code existe déjà dans cette résidence.',
            ], 422);
        }

        $groupe = GroupeHabitation::create([
            'tenant_id'      => config('app.tenant_id'),
            'residence_id'   => $residence->id,
            'nom'            => $data['nom'],
            'code'           => $data['code'] ?? null,
            'description'    => $data['description'] ?? null,
            'total_tantieme' => $data['total_tantieme'] ?? 1000,
        ]);

        $groupe->loadCount('immeubles');

        return response()->json([
            'status'  => 'success',
            'message' => 'Groupe d\'habitation créé',
            'data'    => ['groupe_habitation' => new GroupeHabitationResource($groupe)],
        ], 201);
    }

    public function update(Request $request, Residence $residence, GroupeHabitation $groupeHabitation): JsonResponse
    {
        $this->authorizeResidence($request, $residence);
        abort_if($groupeHabitation->residence_id !== $residence->id, 404);

        $data = $request->validate([
            'nom'            => 'sometimes|string|max:255',
            'code'           => 'nullable|string|max:20',
            'description'    => 'nullable|string',
            'total_tantieme' => 'sometimes|numeric|min:1',
        ]);

        if (isset($data['nom']) && $residence->groupesHabitations()
            ->where('nom', $data['nom'])
            ->where('id', '!=', $groupeHabitation->id)
            ->exists()) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Un groupe avec ce nom existe déjà dans cette résidence.',
            ], 422);
        }

        if (! empty($data['code']) && $residence->groupesHabitations()
            ->where('code', $data['code'])
            ->where('id', '!=', $groupeHabitation->id)
            ->exists()) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Un groupe avec ce code existe déjà dans cette résidence.',
            ], 422);
        }

        $groupeHabitation->update($data);
        $groupeHabitation->loadCount('immeubles');

        return response()->json([
            'status'  => 'success',
            'message' => 'Groupe d\'habitation mis à jour',
            'data'    => ['groupe_habitation' => new GroupeHabitationResource($groupeHabitation)],
        ]);
    }

    public function destroy(Request $request, Residence $residence, GroupeHabitation $groupeHabitation): JsonResponse
    {
        $this->authorizeResidence($request, $residence);
        abort_if($groupeHabitation->residence_id !== $residence->id, 404);

        // Détache les immeubles rattachés (FK est nullOnDelete, mais on l'écrit
        // explicitement pour rester audit-friendly et indépendant du driver).
        $groupeHabitation->immeubles()->update(['groupe_habitation_id' => null]);

        $groupeHabitation->delete();

        return response()->json(['status' => 'success', 'message' => 'Groupe supprimé']);
    }
}
