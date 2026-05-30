<?php

namespace App\Http\Controllers\Api\Gestionnaire;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;

class EquipeUtilisateurController extends Controller
{
    private function tenantId(): int
    {
        return (int) config('app.tenant_id');
    }

    private function formatUser(User $u): array
    {
        return [
            'id'            => $u->id,
            'name'          => $u->name,
            'email'         => $u->email,
            'role'          => $u->app_role ?? 'gestionnaire',
            'permissions'   => $u->app_permissions ?? [],
            'residence_ids' => $u->equipe_residence_ids ?? [],
            'statut'        => ($u->status === 'active') ? 'actif' : 'inactif',
            'created_at'    => $u->created_at?->toIso8601String(),
        ];
    }

    public function index(): JsonResponse
    {
        $users = User::where('tenant_id', $this->tenantId())
            ->whereHas('roles', fn ($q) => $q->where('name', 'gestionnaire'))
            ->orderBy('name')
            ->get()
            ->map(fn ($u) => $this->formatUser($u));

        return response()->json(['status' => 'success', 'data' => $users]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name'            => 'required|string|max:255',
            'email'           => ['required', 'email', Rule::unique('users', 'email')->whereNull('deleted_at')],
            'password'        => 'required|string|min:8',
            'role'            => ['required', Rule::in(['administrateur', 'gestionnaire', 'assistant', 'comptable'])],
            'permissions'     => 'nullable|array',
            'permissions.*'   => 'string',
            'residence_ids'   => 'nullable|array',
            'residence_ids.*' => 'integer|exists:residences,id',
        ]);

        $user = User::create([
            'tenant_id'            => $this->tenantId(),
            'name'                 => $validated['name'],
            'email'                => $validated['email'],
            'phone'                => null,
            'password'             => Hash::make($validated['password']),
            'role'                 => 'gestionnaire',
            'app_role'             => $validated['role'],
            'app_permissions'      => $validated['permissions'] ?? [],
            'equipe_residence_ids' => $validated['residence_ids'] ?? [],
            'status'               => 'active',
        ]);

        $user->assignRole('gestionnaire');

        return response()->json([
            'status'  => 'success',
            'message' => 'Utilisateur créé.',
            'data'    => $this->formatUser($user),
        ], 201);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $user = User::where('tenant_id', $this->tenantId())->findOrFail($id);

        $validated = $request->validate([
            'name'            => 'sometimes|string|max:255',
            'email'           => ['sometimes', 'email', Rule::unique('users', 'email')->ignore($user->id)->whereNull('deleted_at')],
            'password'        => 'sometimes|string|min:8',
            'role'            => ['sometimes', Rule::in(['administrateur', 'gestionnaire', 'assistant', 'comptable'])],
            'permissions'     => 'sometimes|array',
            'permissions.*'   => 'string',
            'residence_ids'   => 'sometimes|array',
            'residence_ids.*' => 'integer|exists:residences,id',
            'is_active'       => 'sometimes|boolean',
        ]);

        $update = [];
        if (isset($validated['name']))          $update['name']                 = $validated['name'];
        if (isset($validated['email']))         $update['email']                = $validated['email'];
        if (isset($validated['role']))          $update['app_role']             = $validated['role'];
        if (isset($validated['permissions']))   $update['app_permissions']      = $validated['permissions'];
        if (isset($validated['residence_ids'])) $update['equipe_residence_ids'] = $validated['residence_ids'];
        if (isset($validated['is_active']))     $update['status']               = $validated['is_active'] ? 'active' : 'inactive';
        if (isset($validated['password']))      $update['password']             = Hash::make($validated['password']);

        $user->update($update);

        return response()->json([
            'status'  => 'success',
            'message' => 'Utilisateur mis à jour.',
            'data'    => $this->formatUser($user->fresh()),
        ]);
    }

    public function destroy(int $id): JsonResponse
    {
        $user = User::where('tenant_id', $this->tenantId())
            ->whereHas('roles', fn ($q) => $q->where('name', 'gestionnaire'))
            ->findOrFail($id);

        $user->delete();

        return response()->json(['status' => 'success', 'message' => 'Utilisateur supprimé.']);
    }
}
