<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class CheckAppPermission
{
    /**
     * Blocks gestionnaires who have explicit app_permissions that don't include
     * the required permission. Managers and users without app_permissions bypass.
     */
    public function handle(Request $request, Closure $next, string ...$required): Response
    {
        $user = $request->user();

        if (! $user) {
            return $next($request);
        }

        // Managers and super_admins are never restricted
        if ($user->hasRole(['manager', 'super_admin'])) {
            return $next($request);
        }

        // Legacy gestionnaires (no app_permissions set) — not restricted
        $perms = $user->app_permissions ?? [];
        if (empty($perms)) {
            return $next($request);
        }

        // Check at least one of the required permissions is granted
        foreach ($required as $perm) {
            if (in_array($perm, $perms, true)) {
                return $next($request);
            }
        }

        return response()->json([
            'status'  => 'error',
            'message' => 'Accès non autorisé à ce module.',
        ], 403);
    }
}
