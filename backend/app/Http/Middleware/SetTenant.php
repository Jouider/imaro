<?php

namespace App\Http\Middleware;

use App\Models\Tenant;
use Closure;
use Illuminate\Http\Request;

class SetTenant
{
    public function handle(Request $request, Closure $next)
    {
        // Résolution par subdomain : blanca.syndikpro.ma → subdomain = blanca
        $host = $request->getHost();
        $subdomain = explode('.', $host)[0];

        // Exclure les sous-domaines système
        $excluded = ['api', 'app', 'staging', 'www', 'localhost'];

        if (! in_array($subdomain, $excluded) && Tenant::where('subdomain', $subdomain)->exists()) {
            $tenant = Tenant::where('subdomain', $subdomain)->first();
            app()->instance('currentTenant', $tenant);
            config(['app.tenant_id' => $tenant->id]);
        }

        return $next($request);
    }
}
