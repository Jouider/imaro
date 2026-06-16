<?php

/**
 * Fichiers d'association deep-link (KAN-71) — valeurs issues du build natif
 * (Team ID Apple, package + empreinte SHA-256 Android). Renseigner en env une
 * fois l'app native publiée ; les fichiers /.well-known/* sont servis quoi qu'il
 * arrive (les validateurs Apple/Google exigent les vraies valeurs pour passer).
 */
return [
    // iOS — Universal Links
    'apple_team_id' => env('APPLE_TEAM_ID', ''),
    'apple_bundle_id' => env('APPLE_BUNDLE_ID', 'ma.imaro.portail'),

    // Android — App Links
    'android_package' => env('ANDROID_PACKAGE', 'ma.imaro.portail'),
    // Empreintes SHA-256 du certificat de signature, séparées par des virgules.
    'android_sha256' => array_values(array_filter(array_map(
        'trim',
        explode(',', (string) env('ANDROID_SHA256_FINGERPRINTS', '')),
    ))),

    // Chemins gérés par l'app (deep-links portail).
    'paths' => ['/portail/*'],
];
