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
    'chains' => [
        'whatsapp' => ['twilio_whatsapp'],
        'sms'      => ['sms8', 'twilio_sms'], // primary + fallback (mandatory per Phase 1)
        'email'    => ['resend'],
    ],

    'providers' => [
        'twilio_whatsapp' => [
            'sid'   => env('TWILIO_SID'),
            'token' => env('TWILIO_TOKEN'),
            'from'  => env('TWILIO_WHATSAPP_FROM'),
        ],
        'twilio_sms' => [
            'sid'   => env('TWILIO_SID'),
            'token' => env('TWILIO_TOKEN'),
            'from'  => env('TWILIO_SMS_FROM'),
        ],
        'sms8' => [
            'api_key'   => env('SMS8_API_KEY'),
            'device_id' => env('SMS8_DEVICE_ID'),
        ],
        'resend' => [
            'api_key' => env('RESEND_API_KEY'),
            'from'    => env('RESEND_FROM', 'no-reply@imaro.ma'),
        ],
    ],
];
