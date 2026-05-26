<?php

namespace App\Http\Controllers\Api\Gestionnaire;

use App\Http\Controllers\Controller;
use App\Models\AutreRecette;
use App\Models\Residence;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AutreRecetteController extends Controller
{
    public function index(Request $request, Residence $residence): JsonResponse
    {
        $query = AutreRecette::where('residence_id', $residence->id);

        if ($exercice = $request->query('exercice')) {
            $query->where('exercice', $exercice);
        }

        $recettes = $query->orderByDesc('date')
            ->get()
            ->map(fn (AutreRecette $r) => $this->format($r));

        return response()->json([
            'status' => 'success',
            'data'   => ['recettes' => $recettes],
        ]);
    }

    public function store(Request $request, Residence $residence): JsonResponse
    {
        $data = $request->validate([
            'exercice'   => 'required|integer|min:2000|max:2100',
            'date'       => 'required|date',
            'libelle'    => 'required|string|max:255',
            'categorie'  => 'required|in:location_parking,location_salle,location_antenne,subvention,indemnite_assurance,penalite_retard,produits_financiers,autre',
            'montant'    => 'required|numeric|min:0.01',
            'payeur'     => 'nullable|string|max:255',
            'reference'  => 'nullable|string|max:100',
            'notes'      => 'nullable|string',
        ]);

        $data['tenant_id']    = $request->user()->tenant_id;
        $data['residence_id'] = $residence->id;

        $recette = AutreRecette::create($data);

        return response()->json([
            'status'  => 'success',
            'message' => 'Recette créée.',
            'data'    => ['recette' => $this->format($recette)],
        ], 201);
    }

    public function update(Request $request, AutreRecette $autreRecette): JsonResponse
    {
        $data = $request->validate([
            'exercice'   => 'sometimes|integer|min:2000|max:2100',
            'date'       => 'sometimes|date',
            'libelle'    => 'sometimes|string|max:255',
            'categorie'  => 'sometimes|in:location_parking,location_salle,location_antenne,subvention,indemnite_assurance,penalite_retard,produits_financiers,autre',
            'montant'    => 'sometimes|numeric|min:0.01',
            'payeur'     => 'nullable|string|max:255',
            'reference'  => 'nullable|string|max:100',
            'notes'      => 'nullable|string',
        ]);

        $autreRecette->update($data);

        return response()->json([
            'status'  => 'success',
            'message' => 'Recette mise à jour.',
            'data'    => ['recette' => $this->format($autreRecette)],
        ]);
    }

    public function destroy(AutreRecette $autreRecette): JsonResponse
    {
        $autreRecette->delete();

        return response()->json(['status' => 'success', 'message' => 'Recette supprimée.']);
    }

    private function format(AutreRecette $r): array
    {
        return [
            'id'           => $r->id,
            'residence_id' => $r->residence_id,
            'exercice'     => $r->exercice,
            'date'         => $r->date->toDateString(),
            'libelle'      => $r->libelle,
            'categorie'    => $r->categorie,
            'montant'      => round($r->montant, 2),
            'payeur'       => $r->payeur,
            'reference'    => $r->reference,
            'notes'        => $r->notes,
        ];
    }
}
