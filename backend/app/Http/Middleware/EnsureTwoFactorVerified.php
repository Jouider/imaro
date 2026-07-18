<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * KAN-147 — protège le back-office : seul un token COMPLET (ability ['*']),
 * émis après vérification/enrôlement 2FA, est accepté. Les tokens limités
 * ['2fa:challenge'] / ['2fa:enroll'] sont rejetés (403 + code exploitable
 * par le front pour rediriger vers l'écran 2FA).
 */
class EnsureTwoFactorVerified
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (! $user || ! $user->tokenCan('*')) {
            return response()->json([
                'status' => 'error',
                'code' => 'two_factor_required',
                'message' => 'Accès back-office : vérification en deux étapes requise.',
            ], 403);
        }

        return $next($request);
    }
}
