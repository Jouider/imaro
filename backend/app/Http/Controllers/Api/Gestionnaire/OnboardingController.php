<?php

namespace App\Http\Controllers\Api\Gestionnaire;

use App\Http\Controllers\Controller;
use App\Models\Tenant;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class OnboardingController extends Controller
{
    /**
     * PATCH /api/gestionnaire/onboarding
     * Save the wizard's current step for cross-device resume.
     * Manager-only — gestionnaire-employees never see the wizard.
     */
    public function update(Request $request): JsonResponse
    {
        $this->authorizeManager($request);

        $validated = $request->validate([
            'step' => 'required|integer|min:0|max:10',
        ]);

        $tenant = $this->currentTenant();
        $tenant->update(['onboarding_step' => $validated['step']]);

        return $this->payload($tenant);
    }

    /**
     * POST /api/gestionnaire/onboarding/complete
     * Stamp onboarding_completed_at = now() — wizard never shows again.
     */
    public function complete(Request $request): JsonResponse
    {
        $this->authorizeManager($request);

        $tenant = $this->currentTenant();
        $tenant->update([
            'onboarding_completed_at' => now(),
            'onboarding_step'         => null,
        ]);

        return $this->payload($tenant);
    }

    private function authorizeManager(Request $request): void
    {
        if ($request->user()?->role !== 'manager') {
            abort(403, 'Seul le manager peut compléter l\'onboarding.');
        }
    }

    private function currentTenant(): Tenant
    {
        return Tenant::findOrFail((int) config('app.tenant_id'));
    }

    private function payload(Tenant $tenant): JsonResponse
    {
        return response()->json([
            'status' => 'success',
            'data'   => [
                'completed'               => $tenant->onboarding_completed_at !== null,
                'step'                    => $tenant->onboarding_step,
                'onboarding_completed_at' => $tenant->onboarding_completed_at?->toIso8601String(),
            ],
        ]);
    }
}
