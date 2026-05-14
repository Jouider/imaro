<?php

namespace App\Http\Controllers\Api\Gestionnaire;

use App\Http\Controllers\Controller;
use App\Models\Exercice;
use App\Models\Residence;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ExerciceController extends Controller
{
    public function index(Residence $residence): JsonResponse
    {
        abort_if($residence->gestionnaire_id !== auth()->id(), 403);

        $exercices = $residence->exercices()
            ->orderByDesc('annee')
            ->get();

        return response()->json([
            'status' => 'success',
            'data'   => $exercices,
        ]);
    }

    public function store(Request $request, Residence $residence): JsonResponse
    {
        abort_if($residence->gestionnaire_id !== auth()->id(), 403);

        $data = $request->validate([
            'annee'      => 'required|integer|min:2000|max:2100',
            'date_debut' => 'required|date',
            'date_fin'   => 'required|date|after:date_debut',
        ]);

        if ($residence->exercices()->where('annee', $data['annee'])->exists()) {
            return response()->json([
                'status'  => 'error',
                'message' => "Un exercice {$data['annee']} existe déjà pour cette résidence.",
            ], 422);
        }

        $exercice = $residence->exercices()->create([
            'tenant_id'  => $residence->tenant_id,
            'annee'      => $data['annee'],
            'date_debut' => $data['date_debut'],
            'date_fin'   => $data['date_fin'],
            'statut'     => 'actif',
        ]);

        return response()->json([
            'status'  => 'success',
            'message' => "Exercice {$exercice->annee} créé.",
            'data'    => $exercice,
        ], 201);
    }

    public function cloture(Residence $residence, Exercice $exercice): JsonResponse
    {
        abort_if($residence->gestionnaire_id !== auth()->id(), 403);
        abort_if($exercice->residence_id !== $residence->id, 404);

        if ($exercice->statut !== 'actif') {
            return response()->json([
                'status'  => 'error',
                'message' => 'Seul un exercice actif peut être clôturé.',
            ], 422);
        }

        $exercice->update(['statut' => 'cloture']);

        return response()->json([
            'status'  => 'success',
            'message' => "Exercice {$exercice->annee} clôturé.",
            'data'    => $exercice,
        ]);
    }
}
