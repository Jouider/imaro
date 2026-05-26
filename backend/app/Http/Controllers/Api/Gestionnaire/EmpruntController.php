<?php

namespace App\Http\Controllers\Api\Gestionnaire;

use App\Http\Controllers\Controller;
use App\Models\Emprunt;
use App\Models\Residence;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class EmpruntController extends Controller
{
    public function index(Request $request, Residence $residence): JsonResponse
    {
        $emprunts = Emprunt::where('residence_id', $residence->id)
            ->orderByDesc('date_debut')
            ->get()
            ->map(fn (Emprunt $e) => $this->format($e));

        return response()->json([
            'status' => 'success',
            'data'   => ['emprunts' => $emprunts],
        ]);
    }

    public function store(Request $request, Residence $residence): JsonResponse
    {
        $data = $request->validate([
            'libelle'        => 'required|string|max:255',
            'organisme'      => 'required|string|max:255',
            'date_debut'     => 'required|date',
            'date_fin'       => 'required|date|after:date_debut',
            'montant_initial'=> 'required|numeric|min:0',
            'taux_interet'   => 'required|numeric|min:0|max:100',
            'duree_mois'     => 'required|integer|min:1',
            'mensualite'     => 'required|numeric|min:0',
            'notes'          => 'nullable|string',
        ]);

        $data['tenant_id']    = $request->user()->tenant_id;
        $data['residence_id'] = $residence->id;
        $data['paye_cumule']  = 0;
        $data['paye_exercice']= 0;
        $data['reste']        = $data['montant_initial'];
        $data['statut']       = 'actif';

        $emprunt = Emprunt::create($data);

        return response()->json([
            'status'  => 'success',
            'message' => 'Emprunt créé.',
            'data'    => ['emprunt' => $this->format($emprunt)],
        ], 201);
    }

    public function update(Request $request, Emprunt $emprunt): JsonResponse
    {
        $data = $request->validate([
            'libelle'         => 'sometimes|string|max:255',
            'organisme'       => 'sometimes|string|max:255',
            'date_debut'      => 'sometimes|date',
            'date_fin'        => 'sometimes|date',
            'montant_initial' => 'sometimes|numeric|min:0',
            'taux_interet'    => 'sometimes|numeric|min:0|max:100',
            'duree_mois'      => 'sometimes|integer|min:1',
            'mensualite'      => 'sometimes|numeric|min:0',
            'paye_cumule'     => 'sometimes|numeric|min:0',
            'paye_exercice'   => 'sometimes|numeric|min:0',
            'reste'           => 'sometimes|numeric|min:0',
            'statut'          => 'sometimes|in:actif,rembourse,en_defaut',
            'notes'           => 'nullable|string',
        ]);

        $emprunt->update($data);

        return response()->json([
            'status'  => 'success',
            'message' => 'Emprunt mis à jour.',
            'data'    => ['emprunt' => $this->format($emprunt)],
        ]);
    }

    public function destroy(Emprunt $emprunt): JsonResponse
    {
        $emprunt->delete();

        return response()->json(['status' => 'success', 'message' => 'Emprunt supprimé.']);
    }

    private function format(Emprunt $e): array
    {
        return [
            'id'              => $e->id,
            'residence_id'    => $e->residence_id,
            'libelle'         => $e->libelle,
            'organisme'       => $e->organisme,
            'date_debut'      => $e->date_debut->toDateString(),
            'date_fin'        => $e->date_fin->toDateString(),
            'montant_initial' => round($e->montant_initial, 2),
            'taux_interet'    => $e->taux_interet,
            'duree_mois'      => $e->duree_mois,
            'mensualite'      => round($e->mensualite, 2),
            'paye_cumule'     => round($e->paye_cumule, 2),
            'paye_exercice'   => round($e->paye_exercice, 2),
            'reste'           => round($e->reste, 2),
            'statut'          => $e->statut,
            'notes'           => $e->notes,
        ];
    }
}
