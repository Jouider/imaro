<?php

namespace App\Http\Controllers\Api\Resident;

use App\Http\Controllers\Controller;
use App\Models\DeviceToken;
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

    /**
     * POST /api/portail/push/register-device
     * Enregistre (ou rafraîchit) le jeton push natif d'un appareil (FCM/APNs) — KAN-68.
     */
    public function registerDevice(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'token' => 'required|string|max:4096',
            'platform' => 'required|in:ios,android',
            'app_version' => 'nullable|string|max:50',
        ]);

        $user = $request->user();

        DeviceToken::updateOrCreate(
            [
                'user_id' => $user->id,
                'token_hash' => hash('sha256', $validated['token']),
            ],
            [
                'tenant_id' => $user->tenant_id,
                'token' => $validated['token'],
                'platform' => $validated['platform'],
                'app_version' => $validated['app_version'] ?? null,
                'last_used_at' => now(),
            ],
        );

        return response()->json([
            'status' => 'success',
            'message' => 'Appareil enregistré pour les notifications push.',
        ]);
    }

    /**
     * DELETE /api/portail/push/register-device
     * Supprime le jeton de l'appareil (à la déconnexion).
     */
    public function unregisterDevice(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'token' => 'required|string|max:4096',
        ]);

        DeviceToken::where('user_id', $request->user()->id)
            ->where('token_hash', hash('sha256', $validated['token']))
            ->delete();

        return response()->json([
            'status' => 'success',
            'message' => 'Appareil désenregistré.',
        ]);
    }
}
