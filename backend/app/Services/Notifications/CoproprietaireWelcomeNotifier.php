<?php

namespace App\Services\Notifications;

use App\Contracts\Notifications\NotificationChannel;
use App\Contracts\Notifications\NotificationMessage;
use App\Models\Residence;
use App\Models\User;
use App\Notifications\NotificationManager;

/**
 * Sends the welcome / access-code message to a freshly created copropriétaire
 * over every available channel (SMS + WhatsApp if phone, Email if email).
 *
 * Each channel goes through the NotificationManager so fallbacks + logging
 * to notifications_log are applied automatically. Failures on one channel
 * never block another — the gestionnaire still sees the temp code in the
 * API response as a final fallback.
 */
class CoproprietaireWelcomeNotifier
{
    private const TEMPLATE = 'coproprietaire_welcome';

    public function __construct(private readonly NotificationManager $notifier) {}

    public function send(User $user, string $tempCode, ?Residence $residence = null): void
    {
        $residenceName = $residence?->name;

        if ($user->phone) {
            $this->dispatch($user, NotificationChannel::Sms, $this->smsBody($user, $tempCode));
            $this->dispatch($user, NotificationChannel::Whatsapp, $this->whatsappBody($user, $tempCode, $residenceName));
        }

        if ($user->email) {
            $this->dispatch(
                $user,
                NotificationChannel::Email,
                $this->emailBody($user, $tempCode, $residenceName),
                subject: 'Bienvenue sur Imaro — votre code d\'accès',
            );
        }
    }

    private function dispatch(User $user, NotificationChannel $channel, string $body, ?string $subject = null): void
    {
        $this->notifier->send(new NotificationMessage(
            to:           $user,
            channel:      $channel,
            templateName: self::TEMPLATE,
            body:         $body,
            subject:      $subject,
        ));
    }

    private function smsBody(User $user, string $code): string
    {
        // Kept short — Maroc Telecom counts past 160 chars as multiple SMS (each ~0.20 MAD).
        return "Imaro: Bienvenue {$user->name}. Code d'acces: {$code}. Connectez-vous avec {$user->phone}.";
    }

    private function whatsappBody(User $user, string $code, ?string $residenceName): string
    {
        $where = $residenceName ? " ({$residenceName})" : '';

        return "Bonjour {$user->name},\n\n"
            ."Bienvenue sur Imaro{$where} — la plateforme de gestion de votre copropriété.\n\n"
            ."Votre code d'accès : *{$code}*\n"
            ."Numéro de connexion : {$user->phone}\n\n"
            ."À votre première connexion, vous serez invité à créer votre propre mot de passe.";
    }

    private function emailBody(User $user, string $code, ?string $residenceName): string
    {
        $where = $residenceName ? " pour la résidence {$residenceName}" : '';

        return "Bonjour {$user->name},\n\n"
            ."Votre syndic vous a créé un accès au portail Imaro{$where}.\n\n"
            ."Identifiant (téléphone) : {$user->phone}\n"
            ."Code d'accès temporaire : {$code}\n\n"
            ."Connectez-vous sur l'application Imaro pour finaliser votre inscription. "
            ."À la première connexion, vous serez invité à créer votre propre mot de passe.\n\n"
            ."— L'équipe Imaro";
    }
}
