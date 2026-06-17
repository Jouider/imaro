<?php

use App\Http\Controllers\Api\Resident\PortailPaiementOnlineController;
use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return view('welcome');
});

// Retour de la passerelle de paiement (public — redirection sans token) → deep-link app. KAN-72/#251
Route::get('/paiement/retour', [PortailPaiementOnlineController::class, 'retour']);

/*
 * Fichiers d'association deep-link (KAN-71).
 * Servis à la racine du domaine API, en application/json, valeurs depuis config.
 */

// iOS — Universal Links (sans extension, Content-Type: application/json)
Route::get('/.well-known/apple-app-site-association', function () {
    $teamId = config('deeplinks.apple_team_id');
    $bundleId = config('deeplinks.apple_bundle_id');
    $appId = trim("{$teamId}.{$bundleId}", '.');

    return response()->json([
        'applinks' => [
            'apps' => [],
            'details' => [[
                'appID' => $appId,
                'appIDs' => [$appId],
                'paths' => config('deeplinks.paths'),
            ]],
        ],
    ]);
});

// Android — App Links
Route::get('/.well-known/assetlinks.json', function () {
    return response()->json([[
        'relation' => ['delegate_permission/common.handle_all_urls'],
        'target' => [
            'namespace' => 'android_app',
            'package_name' => config('deeplinks.android_package'),
            'sha256_cert_fingerprints' => config('deeplinks.android_sha256'),
        ],
    ]]);
});
