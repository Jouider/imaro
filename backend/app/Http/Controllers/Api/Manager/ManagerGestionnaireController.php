<?php

namespace App\Http\Controllers\Api\Manager;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class ManagerGestionnaireController extends Controller
{
    /**
     * GET /api/manager/gestionnaires — list gestionnaires for this tenant
     */
    public function index(): JsonResponse
    {
        $tenantId = config('app.tenant_id');

        $gestionnaires = User::where('tenant_id', $tenantId)
            ->whereHas('roles', fn ($q) => $q->where('name', 'gestionnaire'))
            ->withCount('residences')
            ->orderBy('name')
            ->get()
            ->map(fn ($u) => [
                'id'                => $u->id,
                'name'              => $u->name,
                'email'             => $u->email,
                'phone'             => $u->phone,
                'nb_residences'     => $u->residences_count,
                'statut'            => $u->is_active ? 'actif' : 'inactif',
                'created_at'        => $u->created_at?->toDateString(),
            ]);

        return response()->json([
            'status' => 'success',
            'data'   => $gestionnaires,
        ]);
    }

    /**
     * POST /api/manager/gestionnaires — create gestionnaire
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name'      => 'required|string|max:255',
            'email'     => 'required|email|unique:users,email',
            'phone'     => 'nullable|string|max:20',
        ]);

        $password = Str::random(12);

        $user = User::create([
            'tenant_id' => config('app.tenant_id'),
            'name'      => $validated['name'],
            'email'     => $validated['email'],
            'phone'     => $validated['phone'] ?? null,
            'password'  => Hash::make($password),
            'is_active' => true,
        ]);

        $user->assignRole('gestionnaire');

        return response()->json([
            'status'  => 'success',
            'message' => 'Gestionnaire créé.',
            'data'    => [
                'id'    => $user->id,
                'name'  => $user->name,
                'email' => $user->email,
                'phone' => $user->phone,
            ],
        ], 201);
    }

    /**
     * PUT /api/manager/gestionnaires/{user} — update gestionnaire
     */
    public function update(Request $request, User $user): JsonResponse
    {
        $validated = $request->validate([
            'name'      => 'sometimes|string|max:255',
            'email'     => 'sometimes|email|unique:users,email,' . $user->id,
            'phone'     => 'nullable|string|max:20',
            'is_active' => 'sometimes|boolean',
        ]);

        $user->update($validated);

        return response()->json([
            'status'  => 'success',
            'message' => 'Gestionnaire mis à jour.',
            'data'    => $user->fresh(),
        ]);
    }

    /**
     * POST /api/manager/residences/{residence}/assign-gestionnaire
     */
    public function assign(Request $request, int $residenceId): JsonResponse
    {
        $validated = $request->validate([
            'gestionnaire_id' => 'required|exists:users,id',
        ]);

        $residence = \App\Models\Residence::findOrFail($residenceId);
        $residence->update(['gestionnaire_id' => $validated['gestionnaire_id']]);

        return response()->json([
            'status'  => 'success',
            'message' => 'Gestionnaire assigné à la résidence.',
            'data'    => $residence->fresh(),
        ]);
    }
}
