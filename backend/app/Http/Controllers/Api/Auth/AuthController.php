<?php

namespace App\Http\Controllers\Api\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\RequestOtpRequest;
use App\Http\Requests\Auth\VerifyOtpRequest;
use App\Http\Resources\UserResource;
use App\Models\User;
use App\Services\OtpService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;

class AuthController extends Controller
{
    public function __construct(private readonly OtpService $otpService) {}

    /**
     * POST /api/auth/request-otp
     * Rate limit : 3 tentatives par téléphone par 10 minutes.
     */
    public function requestOtp(RequestOtpRequest $request): JsonResponse
    {
        $phone = $request->phone;
        $key = 'otp-request:'.$phone;

        if (RateLimiter::tooManyAttempts($key, maxAttempts: 3)) {
            $seconds = RateLimiter::availableIn($key);

            return response()->json([
                'status'  => 'error',
                'message' => "Trop de tentatives. Réessayez dans {$seconds} secondes.",
            ], 429);
        }

        RateLimiter::hit($key, 600);

        $user = User::withoutGlobalScopes()->firstOrCreate(
            ['phone' => $phone],
            [
                'name'      => 'Utilisateur',
                'role'      => 'resident',
                'status'    => 'active',
                'lang'      => 'fr',
                'tenant_id' => config('app.tenant_id'),
            ]
        );

        if ($user->status === 'inactive') {
            return response()->json([
                'status'  => 'error',
                'message' => 'Compte désactivé. Contactez votre syndic.',
            ], 403);
        }

        $this->otpService->generate($user);

        return response()->json([
            'status'  => 'success',
            'message' => 'Code envoyé par WhatsApp',
            'data'    => [
                'expires_in' => 300,
                'phone'      => substr($phone, 0, 6).'****'.substr($phone, -3),
            ],
        ]);
    }

    /**
     * POST /api/auth/verify-otp
     * Rate limit : 5 essais par téléphone par 10 minutes.
     */
    public function verifyOtp(VerifyOtpRequest $request): JsonResponse
    {
        $phone = $request->phone;
        $otp = $request->otp;
        $key = 'otp-verify:'.$phone;

        if (RateLimiter::tooManyAttempts($key, maxAttempts: 5)) {
            $seconds = RateLimiter::availableIn($key);

            return response()->json([
                'status'  => 'error',
                'message' => "Trop de tentatives. Réessayez dans {$seconds} secondes.",
            ], 429);
        }

        $user = User::withoutGlobalScopes()
            ->with('tenant')
            ->where('phone', $phone)
            ->first();

        if (! $user) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Numéro non trouvé.',
            ], 404);
        }

        if (! $this->otpService->verify($user, $otp)) {
            RateLimiter::hit($key, 600);

            return response()->json([
                'status'  => 'error',
                'message' => 'Code invalide ou expiré.',
            ], 401);
        }

        RateLimiter::clear($key);
        RateLimiter::clear('otp-request:'.$phone);
        $this->otpService->invalidate($user);

        $user->update(['last_login_at' => Carbon::now()]);

        $token = $user->createToken(
            name: 'syndikpro-app',
            expiresAt: Carbon::now()->addDays(30)
        )->plainTextToken;

        return response()->json([
            'status'  => 'success',
            'message' => 'Connexion réussie',
            'data'    => [
                'token'      => $token,
                'token_type' => 'Bearer',
                'expires_in' => 30 * 24 * 60 * 60,
                'user'       => new UserResource($user),
            ],
        ]);
    }

    /**
     * GET /api/auth/me
     */
    public function me(Request $request): JsonResponse
    {
        $user = $request->user()->load('tenant');

        return response()->json([
            'status' => 'success',
            'data'   => [
                'user'        => new UserResource($user),
                'roles'       => $user->getRoleNames(),
                'permissions' => $user->getAllPermissions()->pluck('name'),
            ],
        ]);
    }

    /**
     * POST /api/auth/logout
     */
    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json([
            'status'  => 'success',
            'message' => 'Déconnecté avec succès.',
        ]);
    }
}
