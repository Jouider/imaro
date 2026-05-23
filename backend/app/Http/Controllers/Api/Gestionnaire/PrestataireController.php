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

    /**
     * POST /api/gestionnaire/prestataires/bulk
     * Crée plusieurs prestataires en une seule requête (chunks de 50 max).
     * Idempotent : ignore si un prestataire avec le même téléphone existe déjà.
     */
    public function bulkStore(Request $request): JsonResponse
    {
        $request->validate([
            'prestataires'              => ['required', 'array', 'min:1', 'max:50'],
            'prestataires.*.nom'        => ['required', 'string', 'max:255'],
            'prestataires.*.metier'     => ['required', 'string', 'max:100'],
            'prestataires.*.telephone'  => ['required', 'string', 'max:20'],
            'prestataires.*.email'      => ['nullable', 'email', 'max:255'],
            'prestataires.*.ville'      => ['nullable', 'string', 'max:100'],
        ]);

        $tenantId = config('app.tenant_id');
        $created  = 0;
        $errors   = [];

        foreach ($request->prestataires as $index => $data) {
            $line = 'Ligne ' . ($index + 1);
            try {
                // Idempotence : même téléphone dans le même tenant
                if (Prestataire::where('tenant_id', $tenantId)->where('telephone', $data['telephone'])->exists()) {
                    $errors[] = "{$line}: prestataire avec le téléphone '{$data['telephone']}' existe déjà (ignoré).";
                    continue;
                }

                Prestataire::create([
                    'tenant_id'  => $tenantId,
                    'nom'        => $data['nom'],
                    'specialite' => $data['metier'],
                    'telephone'  => $data['telephone'],
                    'email'      => $data['email'] ?? null,
                ]);

                $created++;
            } catch (\Throwable $e) {
                $errors[] = "{$line}: " . $e->getMessage();
            }
        }

        return response()->json([
            'status' => 'success',
            'data'   => ['created' => $created, 'errors' => $errors],
        ]);
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
