<?php

namespace App\Http\Controllers\Api\SuperAdmin;

use App\Http\Controllers\Controller;
use App\Models\Plan;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

/**
 * Gestion des plans commerciaux — back-office Digitoyou (KAN-146).
 */
class PlanController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json([
            'status' => 'success',
            'data' => Plan::orderBy('ordre')->orderBy('price_dh')->get(),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $this->validated($request);
        $plan = Plan::create($data);

        return response()->json([
            'status' => 'success',
            'message' => 'Plan créé.',
            'data' => $plan,
        ], 201);
    }

    public function update(Request $request, Plan $plan): JsonResponse
    {
        $plan->update($this->validated($request, $plan->id));

        return response()->json([
            'status' => 'success',
            'message' => 'Plan mis à jour.',
            'data' => $plan->fresh(),
        ]);
    }

    public function destroy(Plan $plan): JsonResponse
    {
        $plan->delete();

        return response()->json(['status' => 'success', 'message' => 'Plan supprimé.']);
    }

    /** @return array<string, mixed> */
    private function validated(Request $request, ?int $ignoreId = null): array
    {
        return $request->validate([
            'slug' => ['required', 'string', 'max:50', Rule::unique('plans', 'slug')->ignore($ignoreId)],
            'name' => ['required', 'string', 'max:120'],
            'price_dh' => ['required', 'integer', 'min:0'],
            'period' => ['required', Rule::in(['mensuel', 'annuel'])],
            'quota_residences' => ['nullable', 'integer', 'min:0'],
            'quota_lots' => ['nullable', 'integer', 'min:0'],
            'quota_users' => ['nullable', 'integer', 'min:0'],
            'features' => ['nullable', 'array'],
            'features.*' => ['string'],
            'is_active' => ['boolean'],
            'ordre' => ['nullable', 'integer', 'min:0'],
        ]);
    }
}
