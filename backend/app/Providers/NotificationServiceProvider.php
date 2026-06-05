<?php

namespace App\Providers;

use App\Notifications\Channels\ResendEmailProvider;
use App\Notifications\Channels\Sms8Provider;
use App\Notifications\Channels\TwilioSmsProvider;
use App\Notifications\Channels\TwilioWhatsAppProvider;
use App\Notifications\NotificationManager;
use Illuminate\Support\ServiceProvider;

class NotificationServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->app->singleton(NotificationManager::class, function ($app) {
            $cfg = $app['config']->get('notifications');

            $providers = [
                new TwilioWhatsAppProvider(
                    $cfg['providers']['twilio_whatsapp']['sid'] ?? null,
                    $cfg['providers']['twilio_whatsapp']['token'] ?? null,
                    $cfg['providers']['twilio_whatsapp']['from'] ?? null,
                ),
                new Sms8Provider(
                    $cfg['providers']['sms8']['api_key'] ?? null,
                    $cfg['providers']['sms8']['device_id'] ?? null,
                ),
                new TwilioSmsProvider(
                    $cfg['providers']['twilio_sms']['sid'] ?? null,
                    $cfg['providers']['twilio_sms']['token'] ?? null,
                    $cfg['providers']['twilio_sms']['from'] ?? null,
                ),
                new ResendEmailProvider(
                    $cfg['providers']['resend']['api_key'] ?? null,
                    $cfg['providers']['resend']['from'] ?? null,
                ),
            ];

            return new NotificationManager($providers, $cfg['chains'] ?? []);
        });
    }
}
