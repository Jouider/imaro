<?php

namespace App\Http\Controllers\Api\Resident;

use App\Http\Controllers\Controller;
use App\Models\PushSubscription;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PortailPushController extends Controller
{
    /**
     * POST /api/portail/push/subscribe
     * Enregistre ou met à jour la subscription push VAPID du résident.
     */
    public function subscribe(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'endpoint' => 'required|url|max:2048',
            'keys' => 'required|array',
            'keys.p256dh' => 'required|string|max:512',
            'keys.auth' => 'required|string|max:128',
        ]);

        $user = $request->user();

        PushSubscription::updateOrCreate(
            [
                'user_id' => $user->id,
                'endpoint_hash' => hash('sha256', $validated['endpoint']),
            ],
            [
                'tenant_id' => $user->tenant_id,
                'endpoint' => $validated['endpoint'],
                'p256dh' => $validated['keys']['p256dh'],
                'auth' => $validated['keys']['auth'],
                'user_agent' => $request->userAgent(),
            ]
        );

        return response()->json([
            'status' => 'success',
            'message' => 'Subscription push enregistrée.',
        ]);
    }

    /**
     * DELETE /api/portail/push/unsubscribe
     * Supprime la subscription push (opt-out).
     */
    public function unsubscribe(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'endpoint' => 'required|url|max:2048',
        ]);

        PushSubscription::where('user_id', $request->user()->id)
            ->where('endpoint_hash', hash('sha256', $validated['endpoint']))
            ->delete();

        return response()->json([
            'status' => 'success',
            'message' => 'Subscription push supprimée.',
        ]);
    }
}
