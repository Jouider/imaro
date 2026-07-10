<?php

/**
 * Notification provider chains. The NotificationManager walks each list
 * in order, falling back to the next provider on failure.
 *
 * To swap a vendor (Phase 3 migrations from the infra plan):
 *   - SMS:      replace 'sms8' with 'mediatel' in chains.sms
 *   - WhatsApp: replace 'twilio_whatsapp' with 'meta_cloud' in chains.whatsapp
 * That's it — no code changes.
 */
return [
    /*
     * WhatsApp et SMS sont DÉSACTIVÉS par défaut (KAN-118 / KAN-128 — coût).
     * Chaîne vide = aucun provider appelé → aucun envoi payant. Seuls les
     * canaux app (push/in-app) et email restent actifs. Réactivable en env
     * (NOTIFY_WHATSAPP_ENABLED / NOTIFY_SMS_ENABLED = true) sans changement de code.
     */
    'chains' => [
        'whatsapp' => env('NOTIFY_WHATSAPP_ENABLED', false) ? ['twilio_whatsapp'] : [],
        'sms' => env('NOTIFY_SMS_ENABLED', false) ? ['sms8', 'twilio_sms'] : [],
        'email' => ['resend'],
    ],

    /*
     * WhatsApp message templates (Twilio Content API "HX..." SIDs).
     *
     * Keyed by a stable logical name used in code. SIDs differ per environment
     * (each WhatsApp Business Account re-creates them on approval), so they live
     * in env, never hardcoded. Resolve with config("notifications.whatsapp_templates.$name").
     *
     * A Meta-approved template MUST NOT start or end with a {{variable}}.
     */
    'whatsapp_templates' => [
        'appel_fonds' => env('WA_TPL_APPEL_FONDS'),
        'rappel_paiement' => env('WA_TPL_RAPPEL_PAIEMENT'),
        'recu_paiement' => env('WA_TPL_RECU_PAIEMENT'),
        'coproprietaire_welcome' => env('WA_TPL_WELCOME_COPRO'),
        // AUTHENTICATION template (variable {{1}} = code) used by the onboarding
        // cascade. Empty until Meta approves → WhatsApp step is skipped.
        'acces_copro' => env('WA_TPL_ACCES_COPRO'),
    ],

    'providers' => [
        'twilio_whatsapp' => [
            'sid' => env('TWILIO_SID'),
            'token' => env('TWILIO_TOKEN'),
            'from' => env('TWILIO_WHATSAPP_FROM'),
        ],
        'twilio_sms' => [
            'sid' => env('TWILIO_SID'),
            'token' => env('TWILIO_TOKEN'),
            'from' => env('TWILIO_SMS_FROM'),
        ],
        'sms8' => [
            'api_key' => env('SMS8_API_KEY'),
            'device_id' => env('SMS8_DEVICE_ID'),
        ],
        'resend' => [
            'api_key' => env('RESEND_API_KEY'),
            'domain' => env('RESEND_DOMAIN', 'imaro.ma'),
            // Used when the recipient has no tenant (e.g. super_admin emails).
            'fallback_from' => env('RESEND_FALLBACK_FROM', 'no-reply@imaro.ma'),
        ],
    ],
];
