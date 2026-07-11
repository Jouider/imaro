<?php

namespace App\Http\Controllers\Api\Gestionnaire;

use App\Http\Controllers\Controller;
use App\Models\TravauxExceptionnel;
use App\Models\Residence;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TravauxExceptionnelController extends Controller
{
    public function index(Request $request, Residence $residence): JsonResponse
    {
        $travaux = TravauxExceptionnel::where('residence_id', $residence->id)
            ->orderByDesc('date_vote_ag')
            ->get()
            ->map(fn (TravauxExceptionnel $t) => $this->format($t));

        return response()->json([
            'status' => 'success',
            'data'   => ['travaux' => $travaux],
        ]);
    }

    public function store(Request $request, Residence $residence): JsonResponse
    {
        $data = $request->validate([
            'libelle'          => 'required|string|max:255',
            'description'      => 'nullable|string',
            'date_vote_ag'     => 'required|date',
            'ag_id'            => 'nullable|integer|exists:assemblees,id',
            'prestataire'      => 'nullable|string|max:255',
            'montant_vote'     => 'required|numeric|min:0',
            'montant_engage'   => 'nullable|numeric|min:0',
            'montant_regle'    => 'nullable|numeric|min:0',
            'date_debut'       => 'nullable|date',
            'date_fin_prevue'  => 'nullable|date',
            'date_fin_reelle'  => 'nullable|date',
            'statut'           => 'sometimes|in:vote,en_cours,termine,annule',
        ]);

        $data['tenant_id']    = $request->user()->tenant_id;
        $data['residence_id'] = $residence->id;

        $travaux = TravauxExceptionnel::create($data);

        return response()->json([
            'status'  => 'success',
            'message' => 'Travaux exceptionnels créés.',
            'data'    => ['travaux' => $this->format($travaux)],
        ], 201);
    }

    public function update(Request $request, TravauxExceptionnel $travauxExceptionnel): JsonResponse
    {
        $data = $request->validate([
            'libelle'          => 'sometimes|string|max:255',
            'description'      => 'nullable|string',
            'date_vote_ag'     => 'sometimes|date',
            'ag_id'            => 'nullable|integer|exists:assemblees,id',
            'prestataire'      => 'nullable|string|max:255',
            'montant_vote'     => 'sometimes|numeric|min:0',
            'montant_engage'   => 'sometimes|numeric|min:0',
            'montant_regle'    => 'sometimes|numeric|min:0',
            'date_debut'       => 'nullable|date',
            'date_fin_prevue'  => 'nullable|date',
            'date_fin_reelle'  => 'nullable|date',
            'statut'           => 'sometimes|in:vote,en_cours,termine,annule',
        ]);

        $travauxExceptionnel->update($data);

        return response()->json([
            'status'  => 'success',
            'message' => 'Travaux mis à jour.',
            'data'    => ['travaux' => $this->format($travauxExceptionnel)],
        ]);
    }

    public function destroy(TravauxExceptionnel $travauxExceptionnel): JsonResponse
    {
        $travauxExceptionnel->delete();

        return response()->json(['status' => 'success', 'message' => 'Travaux supprimés.']);
    }

    private function format(TravauxExceptionnel $t): array
    {
        return [
            'id'              => $t->id,
            'residence_id'    => $t->residence_id,
            'libelle'         => $t->libelle,
            'description'     => $t->description,
            'date_vote_ag'    => $t->date_vote_ag->toDateString(),
            'ag_id'           => $t->ag_id,
            'prestataire'     => $t->prestataire,
            'montant_vote'    => round($t->montant_vote, 2),
            'montant_engage'  => round($t->montant_engage, 2),
            'montant_regle'   => round($t->montant_regle, 2),
            'date_debut'      => $t->date_debut?->toDateString(),
            'date_fin_prevue' => $t->date_fin_prevue?->toDateString(),
            'date_fin_reelle' => $t->date_fin_reelle?->toDateString(),
            'statut'          => $t->statut,
        ];
    }
}
