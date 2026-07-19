<?php

namespace App\Http\Controllers\Api\SuperAdmin;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\FeatureFlag;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

/**
 * Back-office Digitoyou — feature flags / droits par plan (KAN-142).
 * Activer/désactiver une fonctionnalité par plan sans redéploiement.
 * Réservé au super_admin ; chaque changement est tracé dans l'audit.
 */
class FeatureFlagController extends Controller
{
    /** GET /api/admin/feature-flags */
    public function index(): JsonResponse
    {
        $flags = FeatureFlag::orderBy('key')->get()->map(fn (FeatureFlag $f) => [
            'key' => $f->key,
            'label' => $f->label,
            'description' => $f->description,
            'enabled_plans' => $f->enabled_plans ?? [],
        ]);

        return response()->json(['status' => 'success', 'data' => $flags]);
    }

    /** PUT /api/admin/feature-flags/{featureFlag} — bascule les plans activés. */
    public function update(Request $request, FeatureFlag $featureFlag): JsonResponse
    {
        $data = $request->validate([
            'enabled_plans' => ['present', 'array'],
            'enabled_plans.*' => [Rule::in(config('plans.order', []))],
        ]);

        $before = $featureFlag->enabled_plans ?? [];
        $featureFlag->update(['enabled_plans' => $data['enabled_plans']]);

        AuditLog::create([
            'tenant_id' => null,
            'user_id' => $request->user()->id,
            'user_email' => $request->user()->email,
            'category' => 'system',
            'action' => 'feature_flag_updated',
            'severity' => 'sensitive',
            'target_type' => 'FeatureFlag',
            'target_id' => $featureFlag->id,
            'target_label' => $featureFlag->key,
            'payload' => ['avant' => $before, 'apres' => $data['enabled_plans']],
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
            'created_at' => now(),
        ]);

        return response()->json([
            'status' => 'success',
            'message' => 'Feature flag mis à jour.',
            'data' => [
                'key' => $featureFlag->key,
                'label' => $featureFlag->label,
                'description' => $featureFlag->description,
                'enabled_plans' => $featureFlag->enabled_plans ?? [],
            ],
        ]);
    }
}
