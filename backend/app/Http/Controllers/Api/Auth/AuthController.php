<?php

namespace App\Http\Controllers\Api\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\LoginRequest;
use App\Http\Requests\Auth\ResidentActivateRequest;
use App\Http\Requests\Auth\ResidentLoginRequest;
use App\Http\Resources\UserResource;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\RateLimiter;
use Laravel\Sanctum\PersonalAccessToken;

class AuthController extends Controller
{
    private const TOKEN_TTL_DAYS = 30;

    /** When /me sees a token with less than this left, it auto-rotates to a fresh one. */
    private const TOKEN_REFRESH_THRESHOLD_DAYS = 7;

    /**
     * POST /api/auth/login
     * Email + mot de passe pour : manager, gestionnaire, conseil, super_admin.
     */
    public function login(LoginRequest $request): JsonResponse
    {
        $key = 'login:'.$request->email;

        if (RateLimiter::tooManyAttempts($key, maxAttempts: 5)) {
            $seconds = RateLimiter::availableIn($key);

            return response()->json([
                'status'  => 'error',
                'message' => "Trop de tentatives. Réessayez dans {$seconds} secondes.",
            ], 429);
        }

        $user = User::withoutGlobalScopes()
            ->with('tenant')
            ->where('email', $request->email)
            ->whereNull('deleted_at')
            ->first();

        if (! $user || ! Hash::check($request->password, $user->password)) {
            RateLimiter::hit($key, 600);

            return response()->json([
                'status'  => 'error',
                'message' => 'Email ou mot de passe incorrect.',
            ], 401);
        }

        if ($user->role === 'resident') {
            return response()->json([
                'status'  => 'error',
                'message' => 'Les résidents utilisent le portail mobile.',
            ], 403);
        }

        if ($user->status === 'inactive') {
            return response()->json([
                'status'  => 'error',
                'message' => 'Compte désactivé. Contactez votre administrateur.',
            ], 403);
        }

        RateLimiter::clear($key);

        // Première connexion — l'utilisateur doit créer son propre mot de passe
        if ($user->must_change_password) {
            return response()->json([
                'status'  => 'first_login',
                'message' => 'Première connexion. Veuillez créer votre mot de passe personnel.',
                'data'    => [
                    'email' => $user->email,
                ],
            ]);
        }

        $user->update(['last_login_at' => Carbon::now()]);

        $token = $user->createToken(
            name: 'syndikpro-app',
            expiresAt: Carbon::now()->addDays(self::TOKEN_TTL_DAYS)
        )->plainTextToken;

        return response()->json([
            'status'  => 'success',
            'message' => 'Connexion réussie',
            'data'    => [
                'token'      => $token,
                'token_type' => 'Bearer',
                'expires_in' => self::TOKEN_TTL_DAYS * 86400,
                'user'       => new UserResource($user),
                'tenant'     => $this->tenantData($user),
            ],
        ]);
    }

    /**
     * POST /api/auth/activate
     * Première connexion admin : email + mot de passe temporaire + nouveau mot de passe.
     * Retourne le token directement.
     */
    public function activate(Request $request): JsonResponse
    {
        $key = 'activate:'.$request->email;

        if (RateLimiter::tooManyAttempts($key, maxAttempts: 5)) {
            $seconds = RateLimiter::availableIn($key);

            return response()->json([
                'status'  => 'error',
                'message' => "Trop de tentatives. Réessayez dans {$seconds} secondes.",
            ], 429);
        }

        $validated = $request->validate([
            'email'            => 'required|email',
            'current_password' => 'required|string',
            'new_password'     => 'required|string|min:8|confirmed',
        ]);

        $user = User::withoutGlobalScopes()
            ->with('tenant')
            ->where('email', $validated['email'])
            ->whereNull('deleted_at')
            ->first();

        if (! $user || ! Hash::check($validated['current_password'], $user->password)) {
            RateLimiter::hit($key, 600);

            return response()->json([
                'status'  => 'error',
                'message' => 'Email ou mot de passe temporaire incorrect.',
            ], 401);
        }

        if ($user->role === 'resident') {
            return response()->json([
                'status'  => 'error',
                'message' => 'Les résidents utilisent le portail mobile.',
            ], 403);
        }

        if ($user->status === 'inactive') {
            return response()->json([
                'status'  => 'error',
                'message' => 'Compte désactivé. Contactez votre administrateur.',
            ], 403);
        }

        if (! $user->must_change_password) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Ce compte est déjà activé. Connectez-vous normalement.',
            ], 422);
        }

        $user->update([
            'password'             => Hash::make($validated['new_password']),
            'must_change_password' => false,
            'last_login_at'        => Carbon::now(),
        ]);

        RateLimiter::clear($key);

        $token = $user->createToken(
            name: 'syndikpro-app',
            expiresAt: Carbon::now()->addDays(self::TOKEN_TTL_DAYS)
        )->plainTextToken;

        return response()->json([
            'status'  => 'success',
            'message' => 'Mot de passe créé. Bienvenue sur imaro !',
            'data'    => [
                'token'      => $token,
                'token_type' => 'Bearer',
                'expires_in' => self::TOKEN_TTL_DAYS * 86400,
                'user'       => new UserResource($user->fresh('tenant')),
                'tenant'     => $this->tenantData($user),
            ],
        ]);
    }

    /**
     * POST /api/auth/resident/login
     * Téléphone + code d'accès pour les résidents.
     * Si première connexion → retourne status "first_login" (pas de token).
     */
    public function residentLogin(ResidentLoginRequest $request): JsonResponse
    {
        $key = 'resident-login:'.$request->phone;

        if (RateLimiter::tooManyAttempts($key, maxAttempts: 5)) {
            $seconds = RateLimiter::availableIn($key);

            return response()->json([
                'status'  => 'error',
                'message' => "Trop de tentatives. Réessayez dans {$seconds} secondes.",
            ], 429);
        }

        $user = User::withoutGlobalScopes()
            ->with('tenant')
            ->where('phone', $request->phone)
            ->where('role', 'resident')
            ->whereNull('deleted_at')
            ->first();

        if (! $user || ! $user->access_code || ! Hash::check($request->code, $user->access_code)) {
            RateLimiter::hit($key, 600);

            return response()->json([
                'status'  => 'error',
                'message' => 'Numéro ou code d\'accès incorrect.',
            ], 401);
        }

        if ($user->status === 'inactive') {
            return response()->json([
                'status'  => 'error',
                'message' => 'Compte désactivé. Contactez votre syndic.',
            ], 403);
        }

        // Première connexion — le résident doit créer son propre code
        if ($user->must_change_code) {
            return response()->json([
                'status'  => 'first_login',
                'message' => 'Première connexion. Veuillez créer votre code d\'accès personnel.',
                'data'    => [
                    'phone' => $request->phone,
                ],
            ]);
        }

        RateLimiter::clear($key);
        $user->update(['last_login_at' => Carbon::now()]);

        $token = $user->createToken(
            name: 'syndikpro-portail',
            expiresAt: Carbon::now()->addDays(self::TOKEN_TTL_DAYS)
        )->plainTextToken;

        return response()->json([
            'status'  => 'success',
            'message' => 'Connexion réussie',
            'data'    => [
                'token'      => $token,
                'token_type' => 'Bearer',
                'expires_in' => self::TOKEN_TTL_DAYS * 86400,
                'user'       => new UserResource($user),
                'tenant'     => $this->tenantData($user),
            ],
        ]);
    }

    /**
     * POST /api/auth/resident/activate
     * Première connexion : téléphone + code_temp + nouveau code.
     * Retourne le token directement.
     */
    public function residentActivate(ResidentActivateRequest $request): JsonResponse
    {
        $key = 'resident-activate:'.$request->phone;

        if (RateLimiter::tooManyAttempts($key, maxAttempts: 5)) {
            $seconds = RateLimiter::availableIn($key);

            return response()->json([
                'status'  => 'error',
                'message' => "Trop de tentatives. Réessayez dans {$seconds} secondes.",
            ], 429);
        }

        $user = User::withoutGlobalScopes()
            ->with('tenant')
            ->where('phone', $request->phone)
            ->where('role', 'resident')
            ->whereNull('deleted_at')
            ->first();

        if (! $user || ! $user->access_code || ! Hash::check($request->temp_code, $user->access_code)) {
            RateLimiter::hit($key, 600);

            return response()->json([
                'status'  => 'error',
                'message' => 'Numéro ou code temporaire incorrect.',
            ], 401);
        }

        if (! $user->must_change_code) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Ce compte est déjà activé.',
            ], 422);
        }

        $user->update([
            'access_code'      => Hash::make($request->new_code),
            'must_change_code' => false,
            'last_login_at'    => Carbon::now(),
        ]);

        RateLimiter::clear($key);

        $token = $user->createToken(
            name: 'syndikpro-portail',
            expiresAt: Carbon::now()->addDays(self::TOKEN_TTL_DAYS)
        )->plainTextToken;

        return response()->json([
            'status'  => 'success',
            'message' => 'Code créé. Bienvenue sur imaro !',
            'data'    => [
                'token'      => $token,
                'token_type' => 'Bearer',
                'expires_in' => self::TOKEN_TTL_DAYS * 86400,
                'user'       => new UserResource($user),
                'tenant'     => $this->tenantData($user),
            ],
        ]);
    }

    /**
     * GET /api/auth/me
     *
     * Renvoie le profil courant. Bonus : si le token expire bientôt (< 7j),
     * on en émet un nouveau de 30j et on le renvoie dans `data.token` pour
     * que le client puisse le swap. Permet aux sessions mobiles longues
     * (resident) de rester valides sans forcer de reconnexion.
     */
    public function me(Request $request): JsonResponse
    {
        $user = $request->user()->load('tenant');
        $current = $request->user()->currentAccessToken();

        $data = [
            'user'   => new UserResource($user),
            'tenant' => $this->tenantData($user),
        ];

        if ($this->shouldRefresh($current)) {
            $newToken = $user->createToken(
                name:      $current->name,
                expiresAt: Carbon::now()->addDays(self::TOKEN_TTL_DAYS),
            )->plainTextToken;

            // Drop the soon-to-expire token so the client can't reuse it.
            $current->delete();

            $data['token']      = $newToken;
            $data['token_type'] = 'Bearer';
            $data['expires_in'] = self::TOKEN_TTL_DAYS * 86400;
            $data['refreshed']  = true;
        }

        return response()->json([
            'status' => 'success',
            'data'   => $data,
        ]);
    }

    private function shouldRefresh(?object $token): bool
    {
        // TransientToken (e.g. actingAs in tests, or session-based guards) carries
        // no expiry metadata, so there is nothing to refresh.
        if (! $token instanceof PersonalAccessToken) {
            return false;
        }

        if (! $token->expires_at) {
            return false;
        }

        return Carbon::parse($token->expires_at)
            ->lt(Carbon::now()->addDays(self::TOKEN_REFRESH_THRESHOLD_DAYS));
    }

    private function tenantData(User $user): ?array
    {
        if (! $user->tenant) {
            return null;
        }

        return [
            'id'                      => $user->tenant->id,
            'name'                    => $user->tenant->name,
            'subdomain'               => $user->tenant->subdomain,
            'plan'                    => $user->tenant->plan,
            'onboarding_completed_at' => $user->tenant->onboarding_completed_at?->toIso8601String(),
            'onboarding_step'         => $user->tenant->onboarding_step,
        ];
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
