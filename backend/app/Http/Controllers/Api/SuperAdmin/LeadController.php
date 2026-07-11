<?php

namespace App\Http\Controllers\Api\SuperAdmin;

use App\Http\Controllers\Controller;
use App\Models\Lead;
use App\Models\Tenant;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

/**
 * Back-office — pipeline commercial (démos / leads). Réservé au super_admin.
 */
class LeadController extends Controller
{
    /** Essai par défaut à la conversion d'un lead en client (jours). */
    private const TRIAL_DAYS = 14;

    public function index(Request $request): JsonResponse
    {
        $query = Lead::query()->with('convertedTenant:id,name,subdomain');

        if ($request->filled('statut')) {
            $query->where('statut', $request->statut);
        }
        if ($request->filled('source')) {
            $query->where('source', $request->source);
        }
        if ($search = $request->query('search')) {
            $query->where(fn ($q) => $q->where('cabinet_nom', 'like', "%{$search}%")
                ->orWhere('contact_nom', 'like', "%{$search}%")
                ->orWhere('contact_email', 'like', "%{$search}%")
                ->orWhere('ville', 'like', "%{$search}%"));
        }

        return response()->json([
            'status' => 'success',
            'data' => ['leads' => $query->orderByDesc('created_at')->get()->map(fn (Lead $l) => $this->present($l))],
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $this->validateLead($request);
        // Défauts explicites (sinon l'instance créée renvoie null avant rechargement DB).
        $data['statut'] ??= 'nouveau';
        $data['source'] ??= 'autre';
        $lead = Lead::create($data);

        return response()->json(['status' => 'success', 'message' => 'Lead créé.', 'data' => ['lead' => $this->present($lead)]], 201);
    }

    public function show(Lead $lead): JsonResponse
    {
        return response()->json(['status' => 'success', 'data' => ['lead' => $this->present($lead->load('convertedTenant:id,name,subdomain'))]]);
    }

    public function update(Request $request, Lead $lead): JsonResponse
    {
        $lead->update($this->validateLead($request, partial: true));

        return response()->json(['status' => 'success', 'message' => 'Lead mis à jour.', 'data' => ['lead' => $this->present($lead->fresh())]]);
    }

    public function destroy(Lead $lead): JsonResponse
    {
        $lead->delete();

        return response()->json(['status' => 'success', 'message' => 'Lead supprimé.']);
    }

    /**
     * POST /api/admin/leads/{lead}/convertir — crée un client (Tenant) en essai
     * à partir du lead et marque le lead « gagné ».
     */
    public function convertir(Request $request, Lead $lead): JsonResponse
    {
        if ($lead->converted_tenant_id) {
            return response()->json(['status' => 'error', 'message' => 'Ce lead a déjà été converti.'], 422);
        }
        if (blank($lead->contact_email)) {
            return response()->json(['status' => 'error', 'message' => 'Email de contact requis pour convertir en client.'], 422);
        }
        if (Tenant::where('email', $lead->contact_email)->exists()) {
            return response()->json(['status' => 'error', 'message' => 'Un client avec cet email existe déjà.'], 422);
        }

        $data = $request->validate(['plan' => ['sometimes', Rule::in(['starter', 'growth', 'pro', 'business', 'large', 'enterprise'])]]);

        $tenant = Tenant::create([
            'name' => $lead->cabinet_nom,
            'email' => $lead->contact_email,
            'phone' => $lead->contact_telephone,
            'subdomain' => $this->subdomainUnique($lead->cabinet_nom),
            'plan' => $data['plan'] ?? 'starter',
            'status' => 'trial',
            'trial_ends_at' => now()->addDays(self::TRIAL_DAYS),
        ]);

        $lead->update(['statut' => 'gagne', 'converted_tenant_id' => $tenant->id]);

        return response()->json([
            'status' => 'success',
            'message' => 'Lead converti en client (essai).',
            'data' => [
                'lead' => $this->present($lead->fresh()->load('convertedTenant:id,name,subdomain')),
                'tenant' => ['id' => $tenant->id, 'name' => $tenant->name, 'subdomain' => $tenant->subdomain, 'plan' => $tenant->plan, 'status' => $tenant->status],
            ],
        ], 201);
    }

    /** @return array<string, mixed> */
    private function validateLead(Request $request, bool $partial = false): array
    {
        $req = $partial ? 'sometimes' : 'required';

        return $request->validate([
            'cabinet_nom' => [$req, 'string', 'max:255'],
            'contact_nom' => ['sometimes', 'nullable', 'string', 'max:255'],
            'contact_email' => ['sometimes', 'nullable', 'email', 'max:255'],
            'contact_telephone' => ['sometimes', 'nullable', 'string', 'max:30'],
            'ville' => ['sometimes', 'nullable', 'string', 'max:120'],
            'source' => ['sometimes', Rule::in(Lead::SOURCES)],
            'statut' => ['sometimes', Rule::in(Lead::STATUTS)],
            'date_demo' => ['sometimes', 'nullable', 'date'],
            'notes' => ['sometimes', 'nullable', 'string', 'max:5000'],
        ]);
    }

    private function subdomainUnique(string $nom): string
    {
        $base = Str::slug(Str::limit($nom, 40, '')) ?: 'cabinet';
        $sub = $base;
        $i = 1;
        while (Tenant::where('subdomain', $sub)->exists()) {
            $sub = $base.'-'.(++$i);
        }

        return $sub;
    }

    /** @return array<string, mixed> */
    private function present(Lead $l): array
    {
        return [
            'id' => $l->id,
            'cabinet_nom' => $l->cabinet_nom,
            'contact_nom' => $l->contact_nom,
            'contact_email' => $l->contact_email,
            'contact_telephone' => $l->contact_telephone,
            'ville' => $l->ville,
            'source' => $l->source,
            'statut' => $l->statut,
            'date_demo' => $l->date_demo?->toDateString(),
            'notes' => $l->notes,
            'converted_tenant' => $l->convertedTenant ? [
                'id' => $l->convertedTenant->id,
                'name' => $l->convertedTenant->name,
                'subdomain' => $l->convertedTenant->subdomain,
            ] : null,
            'created_at' => $l->created_at?->toIso8601String(),
        ];
    }
}
