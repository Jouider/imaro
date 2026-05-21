<?php

namespace App\Http\Controllers\Api\Gestionnaire;

use App\Http\Controllers\Controller;
use App\Http\Resources\ImmeubleResource;
use App\Http\Resources\LotResource;
use App\Models\Immeuble;
use App\Models\Residence;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ImmeubleController extends Controller
{
    use Concerns\AuthorizesResidence;

    public function index(Request $request, Residence $residence): JsonResponse
    {
        $this->authorizeResidence($request, $residence);

        $immeubles = $residence->immeubles()
            ->with('groupeHabitation')
            ->withCount('lots')
            ->get();

        return response()->json([
            'status' => 'success',
            'data'   => ['immeubles' => ImmeubleResource::collection($immeubles)],
        ]);
    }

    public function store(Request $request, Residence $residence): JsonResponse
    {
        $this->authorizeResidence(request(), $residence);

        $data = $request->validate([
            'nom'                   => 'required|string|max:255',
            'adresse'               => 'nullable|string|max:500',
            'nb_etages'             => 'nullable|integer|min:0',
            'groupe_habitation_id'  => 'nullable|exists:groupes_habitations,id',
        ]);

        // Vérifier que le GH appartient à cette résidence
        if (! empty($data['groupe_habitation_id'])) {
            $ghBelongsToResidence = $residence->groupesHabitations()
                ->where('id', $data['groupe_habitation_id'])
                ->exists();

            if (! $ghBelongsToResidence) {
                return response()->json([
                    'status'  => 'error',
                    'message' => 'Ce groupe d\'habitation n\'appartient pas à cette résidence.',
                ], 422);
            }
        }

        if ($residence->immeubles()->where('nom', $data['nom'])->exists()) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Un immeuble avec ce nom existe déjà dans cette résidence.',
            ], 422);
        }

        $immeuble = Immeuble::create([
            'tenant_id'             => config('app.tenant_id'),
            'residence_id'          => $residence->id,
            'groupe_habitation_id'  => $data['groupe_habitation_id'] ?? null,
            'nom'                   => $data['nom'],
            'adresse'               => $data['adresse'] ?? null,
            'nb_etages'             => $data['nb_etages'] ?? 0,
            'nb_lots'               => 0,
        ]);

        $immeuble->load('groupeHabitation');

        return response()->json([
            'status'  => 'success',
            'message' => 'Immeuble créé',
            'data'    => ['immeuble' => new ImmeubleResource($immeuble)],
        ], 201);
    }

    public function update(Request $request, Residence $residence, Immeuble $immeuble): JsonResponse
    {
        $this->authorizeResidence(request(), $residence);
        abort_if($immeuble->residence_id !== $residence->id, 404);

        $data = $request->validate([
            'nom'                   => 'sometimes|string|max:255',
            'adresse'               => 'nullable|string|max:500',
            'nb_etages'             => 'sometimes|integer|min:0',
            'groupe_habitation_id'  => 'nullable|exists:groupes_habitations,id',
        ]);

        if (! empty($data['groupe_habitation_id'])) {
            $ghBelongsToResidence = $residence->groupesHabitations()
                ->where('id', $data['groupe_habitation_id'])
                ->exists();

            if (! $ghBelongsToResidence) {
                return response()->json([
                    'status'  => 'error',
                    'message' => 'Ce groupe d\'habitation n\'appartient pas à cette résidence.',
                ], 422);
            }
        }

        $immeuble->update($data);
        $immeuble->load('groupeHabitation');

        return response()->json([
            'status'  => 'success',
            'message' => 'Immeuble mis à jour',
            'data'    => ['immeuble' => new ImmeubleResource($immeuble)],
        ]);
    }

    public function destroy(Residence $residence, Immeuble $immeuble): JsonResponse
    {
        $this->authorizeResidence(request(), $residence);
        abort_if($immeuble->residence_id !== $residence->id, 404);

        if ($immeuble->lots()->exists()) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Impossible de supprimer : cet immeuble contient des lots.',
            ], 422);
        }

        $immeuble->delete();

        return response()->json(['status' => 'success', 'message' => 'Immeuble supprimé']);
    }

    public function lots(Immeuble $immeuble): JsonResponse
    {
        $this->authorizeResidence(request(), $immeuble->residence);

        $lots = $immeuble->lots()->with('coproprietairePrincipal.user')->get();

        return response()->json([
            'status' => 'success',
            'data'   => [
                'lots'           => LotResource::collection($lots),
                'total_tantieme' => $lots->sum('tantieme'),
                'nb_lots'        => $lots->count(),
            ],
        ]);
    }
}
