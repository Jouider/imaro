<?php

return [
    'paths' => ['api/*', 'sanctum/csrf-cookie'],
    'allowed_methods' => ['*'],
    'allowed_origins' => array_filter(array_unique([
        env('FRONTEND_URL', 'http://localhost:5173'),
        env('FRONTEND_URL_LOCAL', 'http://localhost:5173'),
        'http://localhost:5173',
        'http://localhost:3000',
        'https://imaro.ma',
        'https://www.imaro.ma',
        'https://staging.imaro.ma',
        // App mobile Capacitor (KAN-71) — iOS: capacitor://localhost, Android: https://localhost
        'capacitor://localhost',
        'ionic://localhost',
        'https://localhost',
    ])),
    'allowed_origins_patterns' => [],
    'allowed_headers' => ['*'],
    'exposed_headers' => [],
    'max_age' => 0,
    'supports_credentials' => true,
];
