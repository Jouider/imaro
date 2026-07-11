<?php

namespace App\Http\Controllers\Api\Gestionnaire;

use App\Http\Controllers\Controller;
use App\Http\Resources\ContratResource;
use App\Models\Contrat;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class ContratController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Contrat::with(['residence', 'prestataire'])
            ->where('tenant_id', config('app.tenant_id'));

        if ($request->filled('residence_id')) {
            $query->where('residence_id', $request->residence_id);
        }

        if ($request->filled('statut')) {
            $query->where('statut', $request->statut);
        }

        $contrats = $query->orderByDesc('date_fin')->get();

        return response()->json([
            'status' => 'success',
            'data'   => ['contrats' => ContratResource::collection($contrats)],
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'titre'          => 'required|string|max:255',
            'type'           => ['required', Rule::in(['maintenance', 'nettoyage', 'gardiennage', 'ascenseur', 'autre'])],
            'residence_id'   => 'required|exists:residences,id',
            'prestataire_id' => 'required|exists:prestataires,id',
            'montant'        => 'required|numeric|min:0',
            'date_debut'     => 'required|date',
            'date_fin'       => 'required|date|after:date_debut',
        ]);

        $contrat = Contrat::create([
            'tenant_id' => config('app.tenant_id'),
            ...$data,
        ]);

        $contrat->load(['residence', 'prestataire']);

        return response()->json([
            'status'  => 'success',
            'message' => 'Contrat créé',
            'data'    => ['contrat' => new ContratResource($contrat)],
        ], 201);
    }
}
