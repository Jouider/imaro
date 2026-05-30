<?php

namespace App\Http\Controllers\Api\Gestionnaire;

use App\Http\Controllers\Controller;
use App\Models\PersonnelResidence;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class EquipePersonnelController extends Controller
{
    private function tenantId(): int
    {
        return (int) config('app.tenant_id');
    }

    private const POSTES = ['securite', 'menage', 'gardien', 'jardinier', 'technicien', 'concierge'];

    private function formatStaff(PersonnelResidence $p): array
    {
        return [
            'id'            => $p->id,
            'name'          => $p->name,
            'poste'         => $p->poste,
            'residence_id'  => $p->residence_id,
            'residence_nom' => $p->residence?->nom ?? '',
            'phone'         => $p->phone,
            'permissions'   => $p->permissions ?? [],
            'statut'        => $p->is_active ? 'actif' : 'inactif',
            'created_at'    => $p->created_at?->toIso8601String(),
        ];
    }

    public function index(): JsonResponse
    {
        $staff = PersonnelResidence::with('residence')
            ->where('tenant_id', $this->tenantId())
            ->orderBy('name')
            ->get()
            ->map(fn ($p) => $this->formatStaff($p));

        return response()->json(['status' => 'success', 'data' => $staff]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name'           => 'required|string|max:255',
            'poste'          => ['required', Rule::in(self::POSTES)],
            'residence_id'   => 'required|integer|exists:residences,id',
            'phone'          => 'nullable|string|max:20',
            'permissions'    => 'nullable|array',
            'permissions.*'  => 'string',
        ]);

        $staff = PersonnelResidence::create([
            'tenant_id'    => $this->tenantId(),
            'name'         => $validated['name'],
            'poste'        => $validated['poste'],
            'residence_id' => $validated['residence_id'],
            'phone'        => $validated['phone'] ?? null,
            'permissions'  => $validated['permissions'] ?? [],
            'is_active'    => true,
        ]);

        $staff->load('residence');

        return response()->json([
            'status'  => 'success',
            'message' => 'Personnel ajouté.',
            'data'    => $this->formatStaff($staff),
        ], 201);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $staff = PersonnelResidence::where('tenant_id', $this->tenantId())->findOrFail($id);

        $validated = $request->validate([
            'name'          => 'sometimes|string|max:255',
            'poste'         => ['sometimes', Rule::in(self::POSTES)],
            'residence_id'  => 'sometimes|integer|exists:residences,id',
            'phone'         => 'nullable|string|max:20',
            'permissions'   => 'sometimes|array',
            'permissions.*' => 'string',
            'is_active'     => 'sometimes|boolean',
        ]);

        $staff->update($validated);
        $staff->load('residence');

        return response()->json([
            'status'  => 'success',
            'message' => 'Personnel mis à jour.',
            'data'    => $this->formatStaff($staff->fresh(['residence'])),
        ]);
    }

    public function destroy(int $id): JsonResponse
    {
        $staff = PersonnelResidence::where('tenant_id', $this->tenantId())->findOrFail($id);
        $staff->delete();

        return response()->json(['status' => 'success', 'message' => 'Personnel supprimé.']);
    }
}
