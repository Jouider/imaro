<?php

namespace App\Http\Middleware;

use App\Models\Tenant;
use Closure;
use Illuminate\Http\Request;

class SetTenant
{
    public function handle(Request $request, Closure $next)
    {
        // 1. Résolution par subdomain : blanca.imaro.ma → subdomain = blanca
        $host = $request->getHost();
        $subdomain = explode('.', $host)[0];

        $excluded = ['api', 'app', 'staging', 'www', 'localhost'];

        if (! in_array($subdomain, $excluded)) {
            $tenant = Tenant::where('subdomain', $subdomain)->first();
            if ($tenant) {
                app()->instance('currentTenant', $tenant);
                config(['app.tenant_id' => $tenant->id]);

                return $next($request);
            }
        }

        // 2. Fallback : résoudre le tenant depuis l'utilisateur authentifié
        //    (nécessaire sur api.imaro.ma / staging.imaro.ma où le subdomain est système).
        //    On force le guard sanctum car le default guard "web" est session-based
        //    et retourne null sur les requêtes API par Bearer token.
        $user = $request->user('sanctum') ?? $request->user();
        if ($user && $user->tenant_id) {
            $tenant = Tenant::find($user->tenant_id);
            if ($tenant) {
                app()->instance('currentTenant', $tenant);
                config(['app.tenant_id' => $tenant->id]);
            }
        }

        return $next($request);
    }
}
