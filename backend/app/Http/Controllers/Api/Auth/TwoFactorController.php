<?php

namespace App\Http\Controllers\Api\Auth;

use App\Http\Controllers\Controller;
use App\Http\Resources\UserResource;
use App\Models\AuditLog;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Str;
use PragmaRX\Google2FA\Google2FA;

/**
 * KAN-147 — 2FA (TOTP) obligatoire pour l'accès back-office (super_admin).
 *
 * Flux :
 *  - login (AuthController) renvoie un token limité selon l'état 2FA du compte :
 *      · 2FA active   → ability ['2fa:challenge']  → POST /auth/2fa/verify
 *      · 2FA absente  → ability ['2fa:enroll']     → POST /auth/2fa/setup + confirm
 *  - un token complet (ability ['*']) n'est émis qu'après vérification/confirmation.
 *  - le middleware EnsureTwoFactorVerified protège /admin/* (exige ['*']).
 */
class TwoFactorController extends Controller
{
    private const RECOVERY_CODES = 8;

    private function google2fa(): Google2FA
    {
        return new Google2FA;
    }

    /** POST /auth/2fa/setup — génère un secret (non confirmé) + URI otpauth. */
    public function setup(Request $request): JsonResponse
    {
        $user = $request->user();
        $g = $this->google2fa();

        // On (re)génère un secret tant que la 2FA n'est pas confirmée.
        $secret = $g->generateSecretKey();
        $user->forceFill(['two_factor_secret' => $secret])->save();

        return response()->json([
            'status' => 'success',
            'data' => [
                'secret' => $secret,
                'otpauth_url' => $g->getQRCodeUrl('imaro', $user->email ?? (string) $user->id, $secret),
            ],
        ]);
    }

    /** POST /auth/2fa/confirm — vérifie le 1er code, active la 2FA, renvoie codes de secours + token complet. */
    public function confirm(Request $request): JsonResponse
    {
        $data = $request->validate(['code' => ['required', 'string']]);
        $user = $request->user();

        if (! $user->two_factor_secret || ! $this->google2fa()->verifyKey($user->two_factor_secret, $data['code'])) {
            return response()->json(['status' => 'error', 'message' => 'Code invalide.'], 422);
        }

        $plain = collect(range(1, self::RECOVERY_CODES))
            ->map(fn () => strtoupper(Str::random(5).'-'.Str::random(5)));

        $user->forceFill([
            'two_factor_recovery_codes' => $plain->map(fn ($c) => Hash::make($c))->all(),
            'two_factor_confirmed_at' => now(),
        ])->save();

        $this->audit($request, $user, 'twofactor_enabled', '2FA activée');

        // Le compte est désormais vérifié → on délivre un token complet.
        $user->currentAccessToken()?->delete();
        $token = $user->createToken('syndikpro-app')->plainTextToken;

        return response()->json([
            'status' => 'success',
            'message' => '2FA activée.',
            'data' => [
                'recovery_codes' => $plain->all(), // affichés UNE seule fois
                'token' => $token,
                'token_type' => 'Bearer',
                'user' => new UserResource($user),
            ],
        ]);
    }

    /** POST /auth/2fa/verify — vérifie un code TOTP (ou un code de secours) → token complet. */
    public function verify(Request $request): JsonResponse
    {
        $data = $request->validate(['code' => ['required', 'string']]);
        $user = $request->user();

        $key = '2fa:'.$user->id;
        if (RateLimiter::tooManyAttempts($key, 5)) {
            return response()->json(['status' => 'error', 'message' => 'Trop de tentatives. Réessayez plus tard.'], 429);
        }

        if (! $this->verifyTotpOrRecovery($user, $data['code'])) {
            RateLimiter::hit($key, 600);

            return response()->json(['status' => 'error', 'message' => 'Code invalide.'], 401);
        }

        RateLimiter::clear($key);
        $user->update(['last_login_at' => now()]);
        $this->audit($request, $user, 'twofactor_verified', 'Connexion 2FA validée');

        // On échange le token de challenge contre un token complet.
        $user->currentAccessToken()?->delete();
        $token = $user->createToken('syndikpro-app')->plainTextToken;

        return response()->json([
            'status' => 'success',
            'message' => 'Connexion réussie.',
            'data' => [
                'token' => $token,
                'token_type' => 'Bearer',
                'user' => new UserResource($user),
            ],
        ]);
    }

    /** POST /auth/2fa/disable — désactive la 2FA (exige un code valide). Force un ré-enrôlement à la prochaine connexion. */
    public function disable(Request $request): JsonResponse
    {
        $data = $request->validate(['code' => ['required', 'string']]);
        $user = $request->user();

        if (! $this->verifyTotpOrRecovery($user, $data['code'])) {
            return response()->json(['status' => 'error', 'message' => 'Code invalide.'], 422);
        }

        $user->forceFill([
            'two_factor_secret' => null,
            'two_factor_recovery_codes' => null,
            'two_factor_confirmed_at' => null,
        ])->save();

        $this->audit($request, $user, 'twofactor_disabled', '2FA désactivée');

        return response()->json(['status' => 'success', 'message' => '2FA désactivée.']);
    }

    /** Vérifie un code TOTP ; à défaut, tente un code de secours (usage unique). */
    private function verifyTotpOrRecovery(User $user, string $code): bool
    {
        if ($user->two_factor_secret && $this->google2fa()->verifyKey($user->two_factor_secret, $code)) {
            return true;
        }

        $codes = $user->two_factor_recovery_codes ?? [];
        foreach ($codes as $i => $hashed) {
            if (Hash::check($code, $hashed)) {
                unset($codes[$i]); // consommé
                $user->forceFill(['two_factor_recovery_codes' => array_values($codes)])->save();

                return true;
            }
        }

        return false;
    }

    private function audit(Request $request, User $user, string $action, string $label): void
    {
        AuditLog::create([
            'tenant_id' => $user->tenant_id,
            'user_id' => $user->id,
            'user_email' => $user->email,
            'category' => 'auth',
            'action' => $action,
            'severity' => 'sensitive',
            'target_type' => 'User',
            'target_id' => $user->id,
            'target_label' => $label,
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
            'created_at' => now(),
        ]);
    }
}
