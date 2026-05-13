<?php

namespace App\Http\Controllers\Api\Auth;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AuthController extends Controller
{
    /**
     * POST /api/auth/request-otp
     * Envoie un code OTP à 6 chiffres par WhatsApp au numéro fourni.
     */
    public function requestOtp(Request $request): JsonResponse
    {
        $request->validate([
            'phone' => ['required', 'string', 'regex:/^\+212[0-9]{9}$/'],
        ]);

        // TODO: KAN-10 — générer OTP, stocker hashé (5min TTL), envoyer WhatsApp
        // Pour l'instant : simuler l'envoi

        return response()->json([
            'status' => 'success',
            'message' => 'Code envoyé par WhatsApp',
            'data' => ['expires_in' => 300],
        ]);
    }

    /**
     * POST /api/auth/verify-otp
     * Vérifie l'OTP et retourne un token Sanctum + user + role.
     */
    public function verifyOtp(Request $request): JsonResponse
    {
        $request->validate([
            'phone' => ['required', 'string'],
            'otp' => ['required', 'string', 'size:6'],
        ]);

        // TODO: vérifier OTP hashé, créer token Sanctum (sera complété dans KAN-12)

        return response()->json([
            'status' => 'success',
            'data' => [
                'token' => 'STUB_TOKEN_REPLACE_IN_KAN12',
                'user' => ['id' => 1, 'name' => 'Test User', 'role' => 'gestionnaire'],
                'tenant' => ['id' => 1, 'name' => 'Blanca Syndic', 'subdomain' => 'blanca'],
            ],
        ]);
    }

    /**
     * GET /api/auth/me
     */
    public function me(Request $request): JsonResponse
    {
        return response()->json([
            'status' => 'success',
            'data' => [
                'user' => $request->user(),
                'roles' => $request->user()?->getRoleNames(),
            ],
        ]);
    }

    /**
     * POST /api/auth/logout
     */
    public function logout(Request $request): JsonResponse
    {
        $request->user()?->currentAccessToken()?->delete();

        return response()->json([
            'status' => 'success',
            'message' => 'Déconnecté',
        ]);
    }
}
