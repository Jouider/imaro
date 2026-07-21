<?php

namespace App\Http\Controllers\Api\SuperAdmin;

use App\Http\Controllers\Controller;
use App\Models\Invoice;
use App\Models\Tenant;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

/**
 * Abonnements & facturation des cabinets — back-office Digitoyou (KAN-140).
 */
class BillingController extends Controller
{
    /** GET /admin/invoices — toutes les factures (filtre statut / tenant optionnel). */
    public function index(Request $request): JsonResponse
    {
        $invoices = Invoice::with('tenant:id,name')
            ->when($request->query('statut'), fn ($q, $s) => $q->where('statut', $s))
            ->when($request->query('tenant_id'), fn ($q, $id) => $q->where('tenant_id', $id))
            ->orderByDesc('date_emission')
            ->orderByDesc('id')
            ->get()
            ->map(fn (Invoice $i) => $this->present($i));

        return response()->json(['status' => 'success', 'data' => $invoices]);
    }

    /** POST /admin/tenants/{tenant}/invoices — génère une facture. */
    public function store(Request $request, Tenant $tenant): JsonResponse
    {
        $data = $request->validate([
            'montant_dh' => ['required', 'integer', 'min:0'],
            'remise_pct' => ['nullable', 'integer', 'min:0', 'max:100'],
            'periode_label' => ['nullable', 'string', 'max:60'],
            'date_echeance' => ['nullable', 'date'],
        ]);

        $remise = $data['remise_pct'] ?? $tenant->discount_pct ?? 0;
        $net = (int) round($data['montant_dh'] * (1 - $remise / 100));

        $invoice = Invoice::create([
            'tenant_id' => $tenant->id,
            'numero' => 'TMP',
            'montant_dh' => $net,
            'remise_pct' => $remise,
            'statut' => 'envoyee',
            'periode_label' => $data['periode_label'] ?? now()->translatedFormat('F Y'),
            'date_emission' => now()->toDateString(),
            'date_echeance' => $data['date_echeance'] ?? now()->addDays(30)->toDateString(),
        ]);
        $invoice->update(['numero' => 'FA-'.now()->format('Y').'-'.str_pad((string) $invoice->id, 5, '0', STR_PAD_LEFT)]);

        return response()->json([
            'status' => 'success',
            'message' => 'Facture générée.',
            'data' => $this->present($invoice->fresh('tenant')),
        ], 201);
    }

    /** POST /admin/invoices/{invoice}/mark-paid */
    public function markPaid(Invoice $invoice): JsonResponse
    {
        abort_if($invoice->statut === 'annulee', 422, 'Facture annulée.');
        $invoice->update(['statut' => 'payee', 'date_paiement' => now()->toDateString()]);

        return response()->json(['status' => 'success', 'data' => $this->present($invoice->fresh('tenant'))]);
    }

    /** POST /admin/invoices/{invoice}/cancel */
    public function cancel(Invoice $invoice): JsonResponse
    {
        $invoice->update(['statut' => 'annulee']);

        return response()->json(['status' => 'success', 'data' => $this->present($invoice->fresh('tenant'))]);
    }

    /** PUT /admin/tenants/{tenant}/subscription — plan / remise / renouvellement. */
    public function updateSubscription(Request $request, Tenant $tenant): JsonResponse
    {
        $data = $request->validate([
            'plan' => ['sometimes', Rule::in(['starter', 'growth', 'pro', 'business', 'large', 'enterprise'])],
            'discount_pct' => ['sometimes', 'integer', 'min:0', 'max:100'],
            'renewal_at' => ['sometimes', 'nullable', 'date'],
        ]);
        $tenant->update($data);

        return response()->json([
            'status' => 'success',
            'message' => 'Abonnement mis à jour.',
            'data' => [
                'id' => $tenant->id, 'plan' => $tenant->plan,
                'discount_pct' => $tenant->discount_pct, 'renewal_at' => $tenant->renewal_at?->toDateString(),
            ],
        ]);
    }

    /** @return array<string, mixed> */
    private function present(Invoice $i): array
    {
        return [
            'id' => $i->id,
            'tenant' => $i->tenant ? ['id' => $i->tenant->id, 'name' => $i->tenant->name] : null,
            'numero' => $i->numero,
            'montant_dh' => $i->montant_dh,
            'remise_pct' => $i->remise_pct,
            'statut' => $i->statut,
            'periode_label' => $i->periode_label,
            'date_emission' => $i->date_emission?->toDateString(),
            'date_echeance' => $i->date_echeance?->toDateString(),
            'date_paiement' => $i->date_paiement?->toDateString(),
        ];
    }
}
