<?php

namespace App\Services;

use App\Contracts\Notifications\NotificationChannel;
use App\Contracts\Notifications\NotificationMessage;
use App\Models\User;
use App\Notifications\NotificationManager;
use Carbon\Carbon;

class OtpService
{
    private const OTP_TTL_MINUTES = 5;
    private const OTP_LENGTH = 6;

    public function __construct(private readonly NotificationManager $notifier) {}

    /**
     * Génère un OTP, le stocke hashé en DB, et l'envoie via WhatsApp (avec
     * fallback SMS automatique géré par le NotificationManager).
     */
    public function generate(User $user): string
    {
        $otp = str_pad(
            (string) random_int(0, 999999),
            self::OTP_LENGTH,
            '0',
            STR_PAD_LEFT
        );

        $user->update([
            'otp_code'       => hash('sha256', $otp),
            'otp_expires_at' => Carbon::now()->addMinutes(self::OTP_TTL_MINUTES),
        ]);

        $this->notifier->send(new NotificationMessage(
            to:           $user,
            channel:      NotificationChannel::Whatsapp,
            templateName: 'otp_login',
            body:         "Votre code Imaro est : {$otp}. Valable ".self::OTP_TTL_MINUTES.' minutes.',
        ));

        return $otp;
    }

    /**
     * Vérifie le hash SHA-256 et le TTL.
     */
    public function verify(User $user, string $otp): bool
    {
        if (! $user->otp_code || ! $user->otp_expires_at) {
            return false;
        }

        $hashMatch = hash_equals(
            $user->otp_code,
            hash('sha256', $otp)
        );

        $notExpired = Carbon::now()->lt($user->otp_expires_at);

        return $hashMatch && $notExpired;
    }

    /**
     * Invalide l'OTP après utilisation (one-time use).
     */
    public function invalidate(User $user): void
    {
        $user->update([
            'otp_code'       => null,
            'otp_expires_at' => null,
        ]);
    }
}
