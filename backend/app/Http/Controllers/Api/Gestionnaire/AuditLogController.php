<?php

namespace App\Http\Controllers\Api\Gestionnaire;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\StreamedResponse;

class AuditLogController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $tenantId = config('app.tenant_id');

        $query = AuditLog::where('tenant_id', $tenantId)
            ->orderBy('created_at', 'desc');

        if ($request->filled('from')) {
            $query->where('created_at', '>=', $request->from);
        }
        if ($request->filled('to')) {
            $query->where('created_at', '<=', $request->to . ' 23:59:59');
        }
        if ($request->filled('category')) {
            $query->where('category', $request->category);
        }
        if ($request->filled('severity')) {
            $query->where('severity', $request->severity);
        }
        if ($request->filled('action')) {
            $query->where('action', 'like', '%' . $request->action . '%');
        }
        if ($request->filled('target_type')) {
            $query->where('target_type', $request->target_type);
        }
        if ($request->filled('target_id')) {
            $query->where('target_id', $request->target_id);
        }
        if ($request->filled('user_id')) {
            $query->where('user_id', $request->user_id);
        }
        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('action', 'like', "%{$search}%")
                  ->orWhere('target_label', 'like', "%{$search}%")
                  ->orWhere('user_email', 'like', "%{$search}%");
            });
        }

        // Stats
        $statsQuery = clone $query;
        $total = $statsQuery->count();
        $errors = (clone $statsQuery)->where('severity', 'error')->count();
        $sensitive = (clone $statsQuery)->where('severity', 'sensitive')->count();

        // Paginate
        $perPage = min($request->integer('per_page', 25), 100);
        $logs = $query->paginate($perPage);

        return response()->json([
            'status' => 'success',
            'data' => [
                'logs' => $logs->items(),
                'stats' => [
                    'total' => $total,
                    'errors' => $errors,
                    'sensitive' => $sensitive,
                    'error_rate' => $total > 0 ? round(($errors / $total) * 100, 1) : 0,
                ],
                'pagination' => [
                    'current_page' => $logs->currentPage(),
                    'last_page' => $logs->lastPage(),
                    'per_page' => $logs->perPage(),
                    'total' => $logs->total(),
                ],
            ],
        ]);
    }

    public function export(Request $request): StreamedResponse|JsonResponse
    {
        $tenantId = config('app.tenant_id');
        $format = $request->query('format', 'json');

        $query = AuditLog::where('tenant_id', $tenantId)
            ->orderBy('created_at', 'desc');

        if ($request->filled('from')) {
            $query->where('created_at', '>=', $request->from);
        }
        if ($request->filled('to')) {
            $query->where('created_at', '<=', $request->to . ' 23:59:59');
        }
        if ($request->filled('category')) {
            $query->where('category', $request->category);
        }
        if ($request->filled('severity')) {
            $query->where('severity', $request->severity);
        }

        $logs = $query->limit(10000)->get();

        // Log export as sensitive action
        AuditLog::create([
            'tenant_id' => $tenantId,
            'user_id' => auth()->id(),
            'user_email' => auth()->user()?->email,
            'category' => 'system',
            'action' => 'AuditLog.exported',
            'severity' => $logs->count() > 100 ? 'sensitive' : 'info',
            'target_type' => 'AuditLog',
            'target_label' => "Export {$logs->count()} logs",
            'payload' => ['count' => $logs->count(), 'format' => $format],
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
            'created_at' => now(),
        ]);

        if ($format === 'csv') {
            return response()->streamDownload(function () use ($logs) {
                $handle = fopen('php://output', 'w');
                fputcsv($handle, ['id', 'category', 'action', 'severity', 'target_label', 'user_email', 'ip_address', 'created_at']);
                foreach ($logs as $log) {
                    fputcsv($handle, [
                        $log->id, $log->category, $log->action, $log->severity,
                        $log->target_label, $log->user_email, $log->ip_address, $log->created_at,
                    ]);
                }
                fclose($handle);
            }, 'audit-logs.csv', ['Content-Type' => 'text/csv']);
        }

        return response()->streamDownload(function () use ($logs) {
            echo $logs->toJson(JSON_PRETTY_PRINT);
        }, 'audit-logs.json', ['Content-Type' => 'application/json']);
    }
}
