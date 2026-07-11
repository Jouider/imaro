<?php

namespace App\Http\Controllers\Api\SuperAdmin;

use App\Http\Controllers\Controller;
use App\Models\Lot;
use App\Models\Tenant;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
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
