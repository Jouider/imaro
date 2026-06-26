<?php

namespace App\Http\Controllers\Api\Gestionnaire;

use App\Http\Controllers\Api\Gestionnaire\Concerns\AuthorizesResidence;
use App\Http\Controllers\Controller;
use App\Models\CategorieLot;
use App\Models\Residence;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

/**
 * Catégories de lot d'une résidence (KAN-93) — nom + cotisation.
 */
class CategorieLotController extends Controller
{
    use AuthorizesResidence;

    private function format(CategorieLot $c): array
    {
        return [
            'id' => $c->id,
            'residence_id' => $c->residence_id,
            'nom' => $c->nom,
            'cotisation' => $c->cotisation,
            'nb_lots' => $c->lots()->count(),
            'created_at' => $c->created_at?->toIso8601String(),
        ];
    }

    /** GET /api/gestionnaire/residences/{residence}/categories-lot */
    public function index(Request $request, Residence $residence): JsonResponse
    {
        $this->authorizeResidence($request, $residence);

        $cats = CategorieLot::where('residence_id', $residence->id)
            ->orderBy('nom')->get()->map(fn ($c) => $this->format($c));

        return response()->json(['status' => 'success', 'data' => $cats]);
    }

    /** POST /api/gestionnaire/residences/{residence}/categories-lot */
    public function store(Request $request, Residence $residence): JsonResponse
    {
        $this->authorizeResidence($request, $residence);

        $data = $request->validate([
            'nom' => ['required', 'string', 'max:100', Rule::unique('categories_lot', 'nom')->where('residence_id', $residence->id)],
            'cotisation' => ['required', 'numeric', 'min:0', 'max:9999999'],
        ]);

        $cat = CategorieLot::create([
            'tenant_id' => config('app.tenant_id'),
            'residence_id' => $residence->id,
            'nom' => $data['nom'],
            'cotisation' => $data['cotisation'],
        ]);

        return response()->json(['status' => 'success', 'message' => 'Catégorie créée', 'data' => $this->format($cat)], 201);
    }

    /** PUT /api/gestionnaire/categories-lot/{categorie} */
    public function update(Request $request, CategorieLot $categorie): JsonResponse
    {
        $this->authorizeResidence($request, $categorie->residence);

        $data = $request->validate([
            'nom' => ['sometimes', 'string', 'max:100', Rule::unique('categories_lot', 'nom')->where('residence_id', $categorie->residence_id)->ignore($categorie->id)],
            'cotisation' => ['sometimes', 'numeric', 'min:0', 'max:9999999'],
        ]);

        $categorie->update($data);

        return response()->json(['status' => 'success', 'message' => 'Catégorie mise à jour', 'data' => $this->format($categorie->fresh())]);
    }

    /** DELETE /api/gestionnaire/categories-lot/{categorie} */
    public function destroy(Request $request, CategorieLot $categorie): JsonResponse
    {
        $this->authorizeResidence($request, $categorie->residence);

        // Détache les lots (categorie_lot_id → null via nullOnDelete) puis supprime.
        $categorie->delete();

        return response()->json(['status' => 'success', 'message' => 'Catégorie supprimée']);
    }
}
