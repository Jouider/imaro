<?php

namespace App\Http\Controllers\Api\Gestionnaire;

use App\Http\Controllers\Controller;
use App\Http\Resources\PrestataireResource;
use App\Models\Prestataire;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class PrestataireController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Prestataire::where('tenant_id', config('app.tenant_id'));

        if ($request->filled('statut')) {
            $query->where('statut', $request->statut);
        }

        if ($request->filled('specialite')) {
            $query->where('specialite', $request->specialite);
        }

        $prestataires = $query->orderBy('nom')->get();

        return response()->json([
            'status' => 'success',
            'data'   => ['prestataires' => PrestataireResource::collection($prestataires)],
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'nom'        => 'required_without:name|string|max:255',
            'name'       => 'required_without:nom|string|max:255',
            'telephone'  => 'required_without:phone|string|max:20',
            'phone'      => 'required_without:telephone|string|max:20',
            'specialite' => 'required|string|max:100',
            'email'      => 'nullable|email|max:255',
        ]);

        $prestataire = Prestataire::create([
            'tenant_id'  => config('app.tenant_id'),
            'nom'        => $request->input('nom') ?? $request->input('name'),
            'telephone'  => $request->input('telephone') ?? $request->input('phone'),
            'specialite' => $request->input('specialite'),
            'email'      => $request->input('email'),
        ]);

        return response()->json([
            'status'  => 'success',
            'message' => 'Prestataire créé',
            'data'    => ['prestataire' => new PrestataireResource($prestataire)],
        ], 201);
    }

    public function update(Request $request, Prestataire $prestataire): JsonResponse
    {
        abort_if($prestataire->tenant_id !== config('app.tenant_id'), 403);

        $request->validate([
            'nom'        => 'sometimes|string|max:255',
            'name'       => 'sometimes|string|max:255',
            'telephone'  => 'sometimes|string|max:20',
            'phone'      => 'sometimes|string|max:20',
            'specialite' => 'sometimes|string|max:100',
            'email'      => 'nullable|email|max:255',
            'statut'     => ['sometimes', Rule::in(['actif', 'inactif'])],
        ]);

        $prestataire->update(array_filter([
            'nom'        => $request->input('nom') ?? $request->input('name'),
            'telephone'  => $request->input('telephone') ?? $request->input('phone'),
            'specialite' => $request->input('specialite'),
            'email'      => $request->input('email'),
            'statut'     => $request->input('statut'),
        ], fn($v) => $v !== null));

        return response()->json([
            'status'  => 'success',
            'message' => 'Prestataire mis à jour',
            'data'    => ['prestataire' => new PrestataireResource($prestataire)],
        ]);
    }
}
