<?php

namespace App\Http\Controllers\Api\SuperAdmin;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * Back-office Digitoyou — journal d'audit global cross-tenant (KAN-144).
 *
 * Le journal d'audit existe par tenant (KAN-131) ; ici une vue transverse pour
 * la sécurité (connexions échouées, impersonations, suspensions, modifs
 * facturation/flags). Réservé au super_admin, lecture seule.
 */
class AuditController extends Controller
{
    /** GET /api/admin/audit — vue cross-tenant filtrable. */
    public function index(Request $request): JsonResponse
    {
        $logs = $this->filtered($request)
            ->orderByDesc('created_at')
            ->limit(500)
            ->get()
            ->map(fn (AuditLog $l) => $this->present($l));

        return response()->json(['status' => 'success', 'data' => $logs]);
    }

    /** GET /api/admin/audit/export — export CSV (mêmes filtres). */
    public function export(Request $request): StreamedResponse
    {
        $filename = 'audit-'.now()->format('Ymd-His').'.csv';

        return response()->streamDownload(function () use ($request) {
            $out = fopen('php://output', 'w');
            fwrite($out, "\xEF\xBB\xBF"); // BOM UTF-8 (Excel)
            fputcsv($out, ['date', 'tenant', 'categorie', 'action', 'severite', 'cible', 'utilisateur', 'ip']);

            $this->filtered($request)->orderByDesc('created_at')->chunk(500, function ($chunk) use ($out) {
                foreach ($chunk as $l) {
                    fputcsv($out, [
                        $l->created_at?->toIso8601String(),
                        $l->tenant?->name ?? '',
                        $l->category,
                        $l->action,
                        $l->severity,
                        $l->target_label ?? '',
                        $l->user_email ?? '',
                        $l->ip_address ?? '',
                    ]);
                }
            });
            fclose($out);
        }, $filename, ['Content-Type' => 'text/csv; charset=UTF-8']);
    }

    /** Requête de base + filtres (tenant, catégorie, sévérité, période, IP, recherche). */
    private function filtered(Request $request)
    {
        return AuditLog::query()
            ->with('tenant:id,name')
            ->when($request->filled('tenant_id'), fn ($q) => $q->where('tenant_id', $request->query('tenant_id')))
            ->when($request->filled('category'), fn ($q) => $q->where('category', $request->query('category')))
            ->when($request->filled('severity'), fn ($q) => $q->where('severity', $request->query('severity')))
            ->when($request->filled('from'), fn ($q) => $q->where('created_at', '>=', $request->query('from')))
            ->when($request->filled('to'), fn ($q) => $q->where('created_at', '<=', $request->query('to')))
            ->when($request->filled('ip'), fn ($q) => $q->where('ip_address', $request->query('ip')))
            ->when($request->query('search'), function ($q, $s) {
                $q->where(fn ($sub) => $sub
                    ->where('action', 'like', "%{$s}%")
                    ->orWhere('target_label', 'like', "%{$s}%")
                    ->orWhere('user_email', 'like', "%{$s}%"));
            });
    }

    /** @return array<string, mixed> */
    private function present(AuditLog $l): array
    {
        return [
            'id' => $l->id,
            'tenant' => $l->tenant ? ['id' => $l->tenant->id, 'name' => $l->tenant->name] : null,
            'category' => $l->category,
            'action' => $l->action,
            'severity' => $l->severity,
            'target_label' => $l->target_label,
            'user_email' => $l->user_email,
            'ip_address' => $l->ip_address,
            'created_at' => $l->created_at?->toIso8601String(),
        ];
    }
}
