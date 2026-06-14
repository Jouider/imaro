<?php

namespace App\Http\Controllers\Api\Gestionnaire;

use App\Http\Controllers\Controller;
use App\Models\PersonnelResidence;
use App\Models\Residence;
use App\Models\User;
use App\Services\Notifications\CoproprietaireWelcomeNotifier;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Spatie\Permission\Models\Role;

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
            'id' => $p->id,
            'name' => $p->name,
            'poste' => $p->poste,
            'residence_id' => $p->residence_id,
            'residence_nom' => $p->residence?->nom ?? '',
            'phone' => $p->phone,
            'permissions' => $p->permissions ?? [],
            'statut' => $p->is_active ? 'actif' : 'inactif',
            'created_at' => $p->created_at?->toIso8601String(),
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
            'name' => 'required|string|max:255',
            'poste' => ['required', Rule::in(self::POSTES)],
            'residence_id' => 'required|integer|exists:residences,id',
            // Téléphone requis : c'est l'identifiant de connexion du personnel (KAN-52).
            'phone' => ['required', 'string', 'max:20', Rule::unique('users', 'phone')->whereNull('deleted_at')],
            'permissions' => 'nullable|array',
            'permissions.*' => 'string',
        ]);

        // Code d'accès 8 car. lisible (même format que les résidents), généré côté backend.
        $code = strtoupper(Str::random(8));

        $staff = DB::transaction(function () use ($validated, $code) {
            $user = User::create([
                'tenant_id' => $this->tenantId(),
                'name' => $validated['name'],
                'phone' => $validated['phone'],
                'role' => 'personnel',
                'access_code' => Hash::make($code),
                'must_change_code' => true,
                'status' => 'active',
            ]);

            // Rôle Spatie (idempotent) — évite un 403 si un middleware role:personnel arrive plus tard.
            Role::firstOrCreate(['name' => 'personnel', 'guard_name' => 'web']);
            $user->assignRole('personnel');

            return PersonnelResidence::create([
                'tenant_id' => $this->tenantId(),
                'name' => $validated['name'],
                'poste' => $validated['poste'],
                'residence_id' => $validated['residence_id'],
                'user_id' => $user->id,
                'phone' => $validated['phone'],
                'permissions' => $validated['permissions'] ?? [],
                'is_active' => true,
            ]);
        });

        // Transmission du code via la cascade WhatsApp → SMS → email (backend l'envoie).
        $residence = Residence::find($validated['residence_id']);
        app(CoproprietaireWelcomeNotifier::class)->send($staff->user, $code, $residence);

        $staff->load('residence');

        return response()->json([
            'status' => 'success',
            'message' => "Personnel ajouté. Code d'accès envoyé par WhatsApp/SMS.",
            'data' => [
                ...$this->formatStaff($staff),
                // Aperçu masqué uniquement (le code complet n'est jamais renvoyé).
                'code_apercu' => $this->maskCode($code),
            ],
        ], 201);
    }

    /** Aperçu masqué du code, ex. « AB•••••• ». */
    private function maskCode(string $code): string
    {
        return substr($code, 0, 2).str_repeat('•', max(0, strlen($code) - 2));
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $staff = PersonnelResidence::where('tenant_id', $this->tenantId())->findOrFail($id);

        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'poste' => ['sometimes', Rule::in(self::POSTES)],
            'residence_id' => 'sometimes|integer|exists:residences,id',
            'phone' => 'nullable|string|max:20',
            'permissions' => 'sometimes|array',
            'permissions.*' => 'string',
            'is_active' => 'sometimes|boolean',
        ]);

        $staff->update($validated);
        $staff->load('residence');

        return response()->json([
            'status' => 'success',
            'message' => 'Personnel mis à jour.',
            'data' => $this->formatStaff($staff->fresh(['residence'])),
        ]);
    }

    public function destroy(int $id): JsonResponse
    {
        $staff = PersonnelResidence::where('tenant_id', $this->tenantId())->findOrFail($id);
        $staff->delete();

        return response()->json(['status' => 'success', 'message' => 'Personnel supprimé.']);
    }
}
