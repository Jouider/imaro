<?php

namespace App\Http\Controllers\Api\SuperAdmin;

use App\Http\Controllers\Controller;
use App\Models\Lot;
use App\Models\Residence;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Back-office — métriques globales Digitoyou (vue d'ensemble des clients).
 */
class MetricsController extends Controller
{
    public function __invoke(Request $request): JsonResponse
    {
        return response()->json([
            'status' => 'success',
            'data' => [
                'clients' => [
                    'total' => Tenant::count(),
                    'actifs' => Tenant::where('status', 'active')->count(),
                    'essai' => Tenant::where('status', 'trial')->count(),
                    'suspendus' => Tenant::where('status', 'suspended')->count(),
                ],
                'par_plan' => Tenant::selectRaw('plan, COUNT(*) as nb')->groupBy('plan')->pluck('nb', 'plan'),
                'parc' => [
                    'residences' => Residence::withoutGlobalScope('tenant')->count(),
                    'lots' => Lot::withoutGlobalScope('tenant')->count(),
                    'utilisateurs' => User::count(),
                ],
                'essais_expirant_7j' => Tenant::where('status', 'trial')
                    ->whereNotNull('trial_ends_at')
                    ->whereBetween('trial_ends_at', [now(), now()->addDays(7)])
                    ->count(),
                'derniers_clients' => Tenant::orderByDesc('created_at')->limit(5)->get()
                    ->map(fn (Tenant $t) => [
                        'id' => $t->id, 'name' => $t->name, 'plan' => $t->plan,
                        'status' => $t->status, 'created_at' => $t->created_at?->toIso8601String(),
                    ]),
            ],
        ]);
    }
}
