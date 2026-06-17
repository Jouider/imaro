<?php

use App\Http\Middleware\CheckAppPermission;
use App\Http\Middleware\SetTenant;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Validation\ValidationException;
use Spatie\Permission\Exceptions\UnauthorizedException;
use Spatie\Permission\Middleware\PermissionMiddleware;
use Spatie\Permission\Middleware\RoleMiddleware;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
        apiPrefix: 'api',
    )
    ->withMiddleware(function (Middleware $middleware) {
        $middleware->alias([
            'role'           => RoleMiddleware::class,
            'permission'     => PermissionMiddleware::class,
            'set.tenant'     => SetTenant::class,
            'app.permission' => CheckAppPermission::class,
        ]);

        $middleware->api([
            SetTenant::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions) {
        $exceptions->renderable(function (AuthenticationException $e) {
            return response()->json([
                'status' => 'error',
                'message' => 'Non authentifié',
            ], 401);
        });

        $exceptions->renderable(function (ValidationException $e) {
            return response()->json([
                'status' => 'error',
                'message' => 'Validation échouée',
                'errors' => $e->errors(),
            ], 422);
        });

        $exceptions->renderable(function (UnauthorizedException $e) {
            return response()->json([
                'status' => 'error',
                'message' => 'Accès refusé — rôle insuffisant',
            ], 403);
        });
    })->create();
