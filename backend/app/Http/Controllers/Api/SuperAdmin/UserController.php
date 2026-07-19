<?php

namespace App\Http\Controllers\Api\SuperAdmin;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

/**
 * Back-office Digitoyou — gestion globale des utilisateurs, tous cabinets (KAN-141).
 * Support & dépannage : recherche cross-tenant + actions (reset mot de passe,
 * (dés)activation, déconnexion forcée). Réservé au super_admin.
 *
 * Vie privée (CNDP) : aucun secret n'est renvoyé ; les actions sensibles sont
 * tracées dans l'audit.
 */
class UserController extends Controller
{
    /** GET /api/admin/users?q= — recherche globale (nom / email / téléphone / tenant). */
    public function index(Request $request): JsonResponse
    {
        $users = User::query()
            ->with('tenant:id,name')
            ->when($request->query('q'), function ($query, $q) {
                $query->where(fn ($sub) => $sub
                    ->where('name', 'like', "%{$q}%")
                    ->orWhere('email', 'like', "%{$q}%")
                    ->orWhere('phone', 'like', "%{$q}%")
                    ->orWhereHas('tenant', fn ($t) => $t->where('name', 'like', "%{$q}%")));
            })
            ->orderByDesc('last_login_at')
            ->limit(100)
            ->get()
            ->map(fn (User $u) => $this->present($u));

        return response()->json(['status' => 'success', 'data' => $users]);
    }

    /**
     * POST /api/admin/users — création globale d'un utilisateur (KAN-141).
     * Le super_admin rattache l'utilisateur à un cabinet et lui affecte un rôle.
     * Mot de passe temporaire imposé (changement à la première connexion). Audit.
     */
    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255', Rule::unique('users', 'email')->whereNull('deleted_at')],
            'password' => ['required', 'string', 'min:8'],
            'role' => ['required', Rule::in(['manager', 'gestionnaire', 'agent_recouvrement', 'conseil'])],
            'tenant_id' => ['required', 'integer', 'exists:tenants,id'],
            'phone' => ['nullable', 'string', 'max:30'],
        ]);

        $user = User::create([
            'tenant_id' => $data['tenant_id'],
            'name' => $data['name'],
            'email' => $data['email'],
            'phone' => $data['phone'] ?? null,
            'password' => Hash::make($data['password']),
            'role' => $data['role'],
            'status' => 'active',
            'must_change_password' => true,
        ]);
        $user->assignRole($data['role']);

        $this->audit($request, $user, 'user_create', "Utilisateur créé : {$user->email}");

        return response()->json([
            'status' => 'success',
            'message' => 'Utilisateur créé.',
            'data' => $this->present($user->load('tenant:id,name')),
        ], 201);
    }

    /**
     * DELETE /api/admin/users/{user} — suppression (soft delete) d'un utilisateur.
     * Révoque ses tokens pour couper l'accès immédiatement. Tracé audit.
     */
    public function destroy(Request $request, User $user): JsonResponse
    {
        $user->tokens()->delete();
        $this->audit($request, $user, 'user_delete', "Utilisateur supprimé : {$user->email}");
        $user->delete();

        return response()->json(['status' => 'success', 'message' => 'Utilisateur supprimé.']);
    }

    /** POST /api/admin/users/{user}/reset-password — génère un mot de passe temporaire. */
    public function resetPassword(Request $request, User $user): JsonResponse
    {
        $temp = strtoupper(Str::random(10));

        $user->update([
            'password' => Hash::make($temp),
            'must_change_password' => true,
        ]);

        $this->audit($request, $user, 'user_password_reset', 'Réinitialisation du mot de passe');

        return response()->json([
            'status' => 'success',
            'message' => 'Mot de passe temporaire généré.',
            'data' => ['temp_password' => $temp],
        ]);
    }

    /** POST /api/admin/users/{user}/toggle — (dés)active un compte. */
    public function toggle(Request $request, User $user): JsonResponse
    {
        $data = $request->validate(['is_active' => ['required', 'boolean']]);
        $statut = $data['is_active'] ? 'active' : 'inactive';

        $user->update(['status' => $statut]);

        // Un compte désactivé ne doit plus pouvoir agir : on révoque ses tokens.
        if (! $data['is_active']) {
            $user->tokens()->delete();
        }

        $this->audit($request, $user, 'user_toggle_active', $data['is_active'] ? 'Compte activé' : 'Compte désactivé');

        return response()->json(['status' => 'success', 'message' => 'Statut mis à jour.', 'data' => $this->present($user->fresh()->load('tenant:id,name'))]);
    }

    /** POST /api/admin/users/{user}/logout — force la déconnexion (révoque tous les tokens). */
    public function forceLogout(Request $request, User $user): JsonResponse
    {
        $count = $user->tokens()->count();
        $user->tokens()->delete();

        $this->audit($request, $user, 'user_force_logout', "Déconnexion forcée ({$count} session(s))");

        return response()->json(['status' => 'success', 'message' => 'Sessions révoquées.']);
    }

    /** @return array<string, mixed> */
    private function present(User $u): array
    {
        return [
            'id' => $u->id,
            'name' => $u->name,
            'email' => $u->email,
            'phone' => $u->phone,
            'role' => $u->role,
            'tenant' => $u->tenant ? ['id' => $u->tenant->id, 'name' => $u->tenant->name] : null,
            'status' => $u->status,
            'last_login_at' => $u->last_login_at?->toIso8601String(),
        ];
    }

    private function audit(Request $request, User $target, string $action, string $label): void
    {
        AuditLog::create([
            'tenant_id' => $target->tenant_id,
            'user_id' => $request->user()->id,
            'user_email' => $request->user()->email,
            'category' => 'user',
            'action' => $action,
            'severity' => 'sensitive',
            'target_type' => 'User',
            'target_id' => $target->id,
            'target_label' => $target->name,
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
            'created_at' => now(),
        ]);
    }
}
