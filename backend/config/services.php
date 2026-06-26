<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Third Party Services
    |--------------------------------------------------------------------------
    |
    | This file is for storing the credentials for third party services such
    | as Mailgun, Postmark, AWS and more. This file provides the de facto
    | location for this type of information, allowing packages to have
    | a conventional file to locate the various service credentials.
    |
    */

    'postmark' => [
        'key' => env('POSTMARK_API_KEY'),
    ],

    // Assistant EMARO — chat IA (KAN-53). Sans clé, l'assistant répond aux 4
    // questions clés (réponses figées) ; avec clé, le free-form passe par Claude.
    'anthropic' => [
        'key' => env('ANTHROPIC_API_KEY'),
        'model' => env('ANTHROPIC_MODEL', 'claude-haiku-4-5-20251001'),
    ],

    'resend' => [
        'key' => env('RESEND_API_KEY'),
    ],

    'ses' => [
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],

    'slack' => [
        'notifications' => [
            'bot_user_oauth_token' => env('SLACK_BOT_USER_OAUTH_TOKEN'),
            'channel' => env('SLACK_BOT_USER_DEFAULT_CHANNEL'),
        ],
    ],

    // Boîte IT qui reçoit les demandes d'assistance recouvrement (#179).
    'assistance_recouvrement' => [
        'inbox' => env('ASSISTANCE_RECOUVREMENT_EMAIL', 'recouvrement@imaro.ma'),
    ],

    // Push natif Android — Firebase Cloud Messaging HTTP v1 (KAN-68).
    // FCM_CREDENTIALS = chemin vers le JSON du compte de service Firebase.
    'fcm' => [
        'project_id' => env('FCM_PROJECT_ID'),
        'credentials' => env('FCM_CREDENTIALS'),
    ],

    // Paiement en ligne (KAN-72 / #251) — passerelle agnostique.
    // gateway vide = endpoint /paiement/initier renvoie 422 (aucun driver lié).
    'payment' => [
        'gateway' => env('PAYMENT_GATEWAY'),                                  // paydunya | cmi | …
        'app_return' => env('PAYMENT_APP_RETURN', 'imaro://paiement/retour'), // deep-link de retour
    ],

    // Push natif iOS — Apple Push Notification service, auth par clé .p8 (KAN-68).
    'apns' => [
        'key_id' => env('APNS_KEY_ID'),
        'team_id' => env('APNS_TEAM_ID'),
        'bundle_id' => env('APNS_BUNDLE_ID'),
        'key_path' => env('APNS_KEY_PATH'),           // chemin vers AuthKey_XXXX.p8
        'production' => env('APNS_PRODUCTION', false), // false = sandbox
    ],

];
