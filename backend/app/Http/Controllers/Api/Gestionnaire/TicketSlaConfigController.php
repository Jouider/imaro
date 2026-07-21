<?php

namespace App\Http\Controllers\Api\Gestionnaire;

use App\Http\Controllers\Controller;
use App\Models\TicketSlaConfig;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Config SLA des tickets, au niveau du tenant (KAN-89). Manager uniquement —
 * c'est un réglage global du cabinet (délais de rappel par gravité).
 */
class TicketSlaConfigController extends Controller
{
    public function show(Request $request): JsonResponse
    {
        $config = TicketSlaConfig::forTenant((int) config('app.tenant_id'));

        return response()->json(['status' => 'success', 'data' => ['sla' => $this->present($config)]]);
    }

    public function update(Request $request): JsonResponse
    {
        abort_unless($request->user()->role === 'manager', 403, 'Réservé au manager.');

        $data = $request->validate([
            'enabled' => ['required', 'boolean'],
            'urgent_hours' => ['required', 'integer', 'min:1', 'max:8760'],
            'normal_hours' => ['required', 'integer', 'min:1', 'max:8760'],
            'faible_hours' => ['required', 'integer', 'min:1', 'max:8760'],
        ]);

        $config = TicketSlaConfig::updateOrCreate(
            ['tenant_id' => (int) config('app.tenant_id')],
            $data,
        );

        return response()->json([
            'status' => 'success',
            'message' => 'Configuration SLA mise à jour.',
            'data' => ['sla' => $this->present($config)],
        ]);
    }

    private function present(TicketSlaConfig $c): array
    {
        return [
            'enabled' => $c->enabled,
            'urgent_hours' => $c->urgent_hours,
            'normal_hours' => $c->normal_hours,
            'faible_hours' => $c->faible_hours,
        ];
    }
}
