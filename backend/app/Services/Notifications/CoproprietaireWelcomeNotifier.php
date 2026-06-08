<?php

namespace App\Services\Notifications;

use App\Contracts\Notifications\NotificationChannel;
use App\Contracts\Notifications\NotificationMessage;
use App\Models\Residence;
use App\Models\User;
use App\Notifications\NotificationManager;

/**
 * Delivers the access code to a freshly created copropriétaire via a PRIORITY
 * CASCADE — the code must land on exactly ONE channel, most universal first:
 *
 *     SMS (sms8 → twilio_sms)  →  WhatsApp  →  Email
 *
 * Stops at the first success. Email is last because it is optional at copro
 * creation. The WhatsApp step uses a Meta-approved AUTHENTICATION template
 * (variable {{1}} = code); it is only attempted when that template SID is
 * configured — otherwise the cascade falls straight through to Email.
 *
 * If every channel fails, the gestionnaire still sees the temp code in the
 * API response as the final fallback.
 */
class CoproprietaireWelcomeNotifier
{
    private const TEMPLATE = 'coproprietaire_welcome';

    public function __construct(private readonly NotificationManager $notifier) {}

    public function send(User $user, string $tempCode, ?Residence $residence = null): void
    {
        $this->notifier->sendCascade($this->candidates($user, $tempCode, $residence?->name));
    }

    /**
     * Ordered candidate messages (SMS → WhatsApp → Email), skipping channels the
     * recipient can't receive on or that aren't configured.
     *
     * @return list<NotificationMessage>
     */
    private function candidates(User $user, string $code, ?string $residenceName): array
    {
        $candidates = [];

        if ($user->phone) {
            $candidates[] = $this->message(
                $user,
                NotificationChannel::Sms,
                $this->smsBody($user, $code),
            );

            $waSid = config('notifications.whatsapp_templates.acces_copro');
            if ($waSid) {
                $candidates[] = $this->message(
                    $user,
                    NotificationChannel::Whatsapp,
                    $this->whatsappPreview($code),
                    meta: [
                        'content_sid'       => $waSid,
                        'content_variables' => ['1' => $code],
                    ],
                );
            }
        }

        if ($user->email) {
            $candidates[] = $this->message(
                $user,
                NotificationChannel::Email,
                $this->emailBody($user, $code, $residenceName),
                subject: 'Bienvenue sur Imaro — votre code d\'accès',
            );
        }

        return $candidates;
    }

    private function message(
        User $user,
        NotificationChannel $channel,
        string $body,
        ?string $subject = null,
        array $meta = [],
    ): NotificationMessage {
        return new NotificationMessage(
            to:           $user,
            channel:      $channel,
            templateName: self::TEMPLATE,
            body:         $body,
            subject:      $subject,
            meta:         $meta,
            // No category → transactional/security, never muted by prefs.
        );
    }

    private function smsBody(User $user, string $code): string
    {
        // Kept short — Maroc Telecom counts past 160 chars as multiple SMS (each ~0.20 MAD).
        return "Imaro: Bienvenue {$user->name}. Code d'acces: {$code}. Connectez-vous avec {$user->phone}.";
    }

    /** Preview only (logged to notifications_log). The real WA copy is the Meta auth template. */
    private function whatsappPreview(string $code): string
    {
        return "Imaro: votre code d'acces est {$code}.";
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
