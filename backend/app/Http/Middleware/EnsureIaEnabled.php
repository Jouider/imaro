<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * KAN-111 — bloque les endpoints IA tant que la fonctionnalité est désactivée
 * (coût). Réactivable via FEATURE_IA=true (config/features.php). Renvoie un 503
 * explicite sans exécuter la moindre logique IA.
 */
class EnsureIaEnabled
{
    public function handle(Request $request, Closure $next): Response
    {
        abort_unless(config('features.ia'), 503, 'Fonctionnalité IA temporairement désactivée.');

        return $next($request);
    }
}
