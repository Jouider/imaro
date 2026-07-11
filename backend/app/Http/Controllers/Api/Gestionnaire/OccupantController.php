<?php

namespace App\Http\Controllers\Api\Gestionnaire;

use App\Http\Controllers\Controller;
use App\Models\Lot;
use App\Models\Occupant;
use App\Models\Residence;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class OccupantController extends Controller
{
    public function index(Request $request, Lot $lot): JsonResponse
    {
        $occupants = $lot->occupants()
            ->with('coproprietaire.user:id,name')
            ->orderBy('date_debut', 'desc')
            ->get();

        return response()->json([
            'status' => 'success',
            'data' => ['occupants' => $occupants],
        ]);
    }

    public function store(Request $request, Lot $lot): JsonResponse
    {
        $validated = $request->validate([
            'nom' => ['required', 'string', 'max:255'],
            'telephone' => ['nullable', 'string', 'max:20'],
            'email' => ['nullable', 'email', 'max:255'],
            'type' => ['required', 'in:proprietaire_occupant,locataire,usufruitier,autre'],
            'date_debut' => ['required', 'date'],
            'date_fin' => ['nullable', 'date', 'after:date_debut'],
            'coproprietaire_id' => ['nullable', 'exists:coproprietaires,id'],
            'contact_urgence_nom' => ['nullable', 'string', 'max:255'],
            'contact_urgence_telephone' => ['nullable', 'string', 'max:20'],
            'notes' => ['nullable', 'string'],
        ]);

        // Business rule: only 1 proprietaire_occupant active per lot
        if ($validated['type'] === 'proprietaire_occupant') {
            $existing = $lot->occupants()
                ->where('type', 'proprietaire_occupant')
                ->whereNull('date_fin')
                ->exists();

            if ($existing) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Ce lot a déjà un propriétaire occupant actif',
                ], 422);
            }
        }

        $occupant = Occupant::create([
            ...$validated,
            'tenant_id' => config('app.tenant_id'),
            'lot_id' => $lot->id,
        ]);

        return response()->json([
            'status' => 'success',
            'message' => 'Occupant ajouté',
            'data' => $occupant,
        ], 201);
    }

    public function update(Request $request, Occupant $occupant): JsonResponse
    {
        $validated = $request->validate([
            'nom' => ['sometimes', 'string', 'max:255'],
            'telephone' => ['nullable', 'string', 'max:20'],
            'email' => ['nullable', 'email', 'max:255'],
            'type' => ['sometimes', 'in:proprietaire_occupant,locataire,usufruitier,autre'],
            'date_debut' => ['sometimes', 'date'],
            'date_fin' => ['nullable', 'date'],
            'coproprietaire_id' => ['nullable', 'exists:coproprietaires,id'],
            'contact_urgence_nom' => ['nullable', 'string', 'max:255'],
            'contact_urgence_telephone' => ['nullable', 'string', 'max:20'],
            'notes' => ['nullable', 'string'],
        ]);

        $occupant->update($validated);

        return response()->json([
            'status' => 'success',
            'message' => 'Occupant mis à jour',
            'data' => $occupant->fresh(),
        ]);
    }

    public function destroy(Occupant $occupant): JsonResponse
    {
        $occupant->delete();

        return response()->json([
            'status' => 'success',
            'message' => 'Occupant supprimé',
        ]);
    }

    public function indexByResidence(Request $request, Residence $residence): JsonResponse
    {
        $occupants = Occupant::where('tenant_id', config('app.tenant_id'))
            ->whereIn('lot_id', $residence->lots()->pluck('id'))
            ->with(['lot:id,numero', 'coproprietaire.user:id,name'])
            ->orderBy('nom')
            ->get();

        return response()->json([
            'status' => 'success',
            'data' => ['occupants' => $occupants],
        ]);
    }
}
