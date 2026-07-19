<?php

namespace App\Http\Controllers\Api\SuperAdmin;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\ImpersonationSession;
use App\Models\Lot;
use App\Models\Tenant;
use App\Models\User;
use App\Services\TenantOnboarding;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

/**
 * Back-office Digitoyou — gestion des clients (cabinets syndic = tenants).
 * Réservé au super_admin. Opère hors scope tenant (vue transverse).
 */
class TenantController extends Controller
{
    private const PLANS = ['starter', 'growth', 'pro', 'business', 'large', 'enterprise'];

    private const STATUTS = ['trial', 'active', 'suspended'];

    public function index(Request $request): JsonResponse
    {
        $query = Tenant::query()->withCount(['residences', 'users']);

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }
        if ($request->filled('plan')) {
            $query->where('plan', $request->plan);
        }
        if ($search = $request->query('search')) {
            $query->where(fn ($q) => $q->where('name', 'like', "%{$search}%")
                ->orWhere('email', 'like', "%{$search}%")
                ->orWhere('subdomain', 'like', "%{$search}%"));
        }

        $tenants = $query->orderByDesc('created_at')->get()->map(fn (Tenant $t) => $this->present($t));

        return response()->json(['status' => 'success', 'data' => ['tenants' => $tenants]]);
    }

    public function show(Tenant $tenant): JsonResponse
    {
        $tenant->loadCount(['residences', 'users']);

        return response()->json(['status' => 'success', 'data' => ['tenant' => $this->present($tenant, detail: true)]]);
    }

    /**
     * POST /api/admin/tenants — création manuelle d'un cabinet (KAN-138).
     * Onboarding direct depuis le back-office (hors pipeline lead). Tracé audit.
     */
    public function store(Request $request, TenantOnboarding $onboarding): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255', Rule::unique('tenants', 'email')->whereNull('deleted_at')],
            'phone' => ['nullable', 'string', 'max:30'],
            'subdomain' => ['required', 'string', 'max:63', 'regex:/^[a-z0-9-]+$/', Rule::unique('tenants', 'subdomain')->whereNull('deleted_at')],
            'plan' => ['required', Rule::in(self::PLANS)],
            'status' => ['sometimes', Rule::in(self::STATUTS)],
            // Responsable du cabinet (compte manager créé + email de bienvenue) — KAN-138.
            'owner_name' => ['required', 'string', 'max:255'],
            'owner_email' => ['required', 'email', 'max:255', Rule::unique('users', 'email')->whereNull('deleted_at')],
        ]);

        $statut = $data['status'] ?? 'trial';

        [$tenant, $onboard] = DB::transaction(function () use ($data, $statut, $onboarding) {
            $tenant = Tenant::create([
                'name' => $data['name'],
                'email' => $data['email'],
                'phone' => $data['phone'] ?? null,
                'subdomain' => $data['subdomain'],
                'plan' => $data['plan'],
                'status' => $statut,
                'max_logins' => 5,
                'trial_ends_at' => $statut === 'trial' ? now()->addDays(14) : null,
            ]);

            $onboard = $onboarding->createOwner($tenant, $data['owner_name'], $data['owner_email']);

            return [$tenant, $onboard];
        });

        $this->audit($request, $tenant, 'tenant_create', "Cabinet créé : {$tenant->name}");

        return response()->json([
            'status' => 'success',
            'message' => 'Cabinet créé — identifiants envoyés au responsable.',
            'data' => [
                'tenant' => $this->present($tenant->loadCount(['residences', 'users']), detail: true),
                // Mot de passe temporaire en clair pour affichage/copie (partage manuel).
                'owner' => ['name' => $onboard['user']->name, 'email' => $onboard['user']->email],
                'temp_password' => $onboard['temp_password'],
            ],
        ], 201);
    }

    /**
     * DELETE /api/admin/tenants/{tenant} — suppression (soft delete) d'un cabinet.
     * Réversible (SoftDeletes) ; les tokens des utilisateurs sont révoqués pour
     * couper immédiatement l'accès. Tracé audit.
     */
    public function destroy(Request $request, Tenant $tenant): JsonResponse
    {
        $label = $tenant->name;

        User::where('tenant_id', $tenant->id)->each(fn (User $u) => $u->tokens()->delete());
        $tenant->delete();

        $this->audit($request, $tenant, 'tenant_delete', "Cabinet supprimé : {$label}");

        return response()->json(['status' => 'success', 'message' => 'Cabinet supprimé.']);
    }

    public function update(Request $request, Tenant $tenant): JsonResponse
    {
        $data = $request->validate([
            'name' => ['sometimes', 'string', 'max:255'],
            'email' => ['sometimes', 'email', 'max:255', Rule::unique('tenants', 'email')->ignore($tenant->id)],
            'phone' => ['sometimes', 'nullable', 'string', 'max:30'],
            'plan' => ['sometimes', Rule::in(self::PLANS)],
            'max_logins' => ['sometimes', 'integer', 'min:1', 'max:100000'],
            'status' => ['sometimes', Rule::in(self::STATUTS)],
            'trial_ends_at' => ['sometimes', 'nullable', 'date'],
        ]);

        $tenant->update($data);

        return response()->json([
            'status' => 'success',
            'message' => 'Client mis à jour.',
            'data' => ['tenant' => $this->present($tenant->fresh()->loadCount(['residences', 'users']), detail: true)],
        ]);
    }

    public function suspend(Tenant $tenant): JsonResponse
    {
        $tenant->update(['status' => 'suspended']);

        return response()->json(['status' => 'success', 'message' => 'Client suspendu.', 'data' => ['tenant' => $this->present($tenant)]]);
    }

    public function activate(Tenant $tenant): JsonResponse
    {
        $tenant->update(['status' => 'active']);

        return response()->json(['status' => 'success', 'message' => 'Client activé.', 'data' => ['tenant' => $this->present($tenant)]]);
    }

    public function extendTrial(Request $request, Tenant $tenant): JsonResponse
    {
        $data = $request->validate(['jours' => ['required', 'integer', 'min:1', 'max:365']]);

        $base = $tenant->trial_ends_at && $tenant->trial_ends_at->isFuture() ? $tenant->trial_ends_at : now();
        $tenant->update(['trial_ends_at' => $base->copy()->addDays($data['jours']), 'status' => 'trial']);

        return response()->json([
            'status' => 'success',
            'message' => "Essai prolongé de {$data['jours']} jours.",
            'data' => ['tenant' => $this->present($tenant->fresh())],
        ]);
    }

    /**
     * GET /api/admin/tenants/{tenant}/activity
     * Journal d'activité récent du cabinet (support / suivi) — brique 4.
     */
    public function activity(Tenant $tenant): JsonResponse
    {
        $logs = AuditLog::where('tenant_id', $tenant->id)
            ->orderByDesc('created_at')
            ->limit(50)
            ->get()
            ->map(fn (AuditLog $l) => [
                'id' => $l->id,
                'action' => $l->action,
                'category' => $l->category,
                'severity' => $l->severity,
                'user_email' => $l->user_email,
                'target_label' => $l->target_label,
                'created_at' => $l->created_at?->toIso8601String(),
            ]);

        return response()->json(['status' => 'success', 'data' => ['activity' => $logs]]);
    }

    /**
     * POST /api/admin/tenants/{tenant}/impersonate
     * Émet un token Sanctum court (30 min, ability « impersonation ») pour un
     * manager du cabinet, afin de dépanner. Tracé dans l'audit (CNDP).
     */
    public function impersonate(Request $request, Tenant $tenant): JsonResponse
    {
        $manager = User::where('tenant_id', $tenant->id)
            ->where('role', 'manager')
            ->where('status', 'active')
            ->first();

        if (! $manager) {
            return response()->json(['status' => 'error', 'message' => 'Aucun manager actif pour ce cabinet.'], 422);
        }

        $expiresAt = now()->addMinutes(30);
        $newToken = $manager->createToken('impersonation', ['impersonation'], $expiresAt);
        $token = $newToken->plainTextToken;

        // Trace la session pour l'historique + la révocation manuelle (KAN-147).
        ImpersonationSession::create([
            'admin_id' => $request->user()->id,
            'tenant_id' => $tenant->id,
            'impersonated_user_id' => $manager->id,
            'token_id' => $newToken->accessToken->getKey(),
            'started_at' => now(),
            'expires_at' => $expiresAt,
            'ip_address' => $request->ip(),
        ]);

        AuditLog::create([
            'tenant_id' => $tenant->id,
            'user_id' => $request->user()->id,
            'user_email' => $request->user()->email,
            'category' => 'auth',
            'action' => 'impersonation_start',
            'severity' => 'sensitive',
            'target_type' => 'Tenant',
            'target_id' => $tenant->id,
            'target_label' => $tenant->name,
            'payload' => ['impersonated_user_id' => $manager->id, 'expires_at' => $expiresAt->toIso8601String()],
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
            'created_at' => now(),
        ]);

        return response()->json([
            'status' => 'success',
            'message' => 'Session de dépannage ouverte (30 min).',
            'data' => [
                'token' => $token,
                'expires_at' => $expiresAt->toIso8601String(),
                'impersonated_user' => ['id' => $manager->id, 'name' => $manager->name, 'role' => $manager->role],
                'tenant' => ['id' => $tenant->id, 'name' => $tenant->name, 'subdomain' => $tenant->subdomain],
            ],
        ]);
    }

    private function audit(Request $request, Tenant $tenant, string $action, string $label): void
    {
        AuditLog::create([
            'tenant_id' => $tenant->id,
            'user_id' => $request->user()->id,
            'user_email' => $request->user()->email,
            'category' => 'tenant',
            'action' => $action,
            'severity' => 'sensitive',
            'target_type' => 'Tenant',
            'target_id' => $tenant->id,
            'target_label' => $label,
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
            'created_at' => now(),
        ]);
    }

    /** @return array<string, mixed> */
    private function present(Tenant $t, bool $detail = false): array
    {
        $base = [
            'id' => $t->id,
            'name' => $t->name,
            'email' => $t->email,
            'phone' => $t->phone,
            'subdomain' => $t->subdomain,
            'plan' => $t->plan,
            'status' => $t->status,
            'trial_ends_at' => $t->trial_ends_at?->toIso8601String(),
            'max_logins' => $t->max_logins,
            'nb_residences' => $t->residences_count ?? 0,
            'nb_users' => $t->users_count ?? 0,
            'created_at' => $t->created_at?->toIso8601String(),
        ];

        if ($detail) {
            $base['nb_lots'] = Lot::withoutGlobalScope('tenant')->where('tenant_id', $t->id)->count();
            $base['rc'] = $t->rc;
            $base['if_number'] = $t->if_number;
            $base['rib'] = $t->rib;
            $base['onboarding_completed_at'] = $t->onboarding_completed_at?->toIso8601String();
        }

        return $base;
    }
}
