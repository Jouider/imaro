<?php

namespace App\Services\Notifications;

use App\Contracts\Notifications\NotificationChannel;
use App\Contracts\Notifications\NotificationMessage;
use App\Contracts\Notifications\NotificationResult;
use App\Models\User;
use App\Notifications\NotificationManager;

/**
 * Envoie ses identifiants de connexion (email + mot de passe temporaire) à un
 * membre de l'équipe gestionnaire — canal EMAIL uniquement, car les
 * utilisateurs de l'application se connectent avec email + mot de passe
 * (contrairement aux résidents/personnel terrain qui utilisent un code). KAN-137.
 */
class TeamMemberCredentialsNotifier
{
    private const TEMPLATE = 'team_member_credentials';

    public function __construct(private readonly NotificationManager $notifier) {}

    public function send(User $user, string $tempPassword): NotificationResult
    {
        return $this->notifier->send(new NotificationMessage(
            to: $user,
            channel: NotificationChannel::Email,
            templateName: self::TEMPLATE,
            body: $this->emailBody($user, $tempPassword),
            subject: 'Vos identifiants Imaro',
            // Transactionnel/sécurité → jamais coupé par les préférences.
        ));
    }

    private function emailBody(User $user, string $password): string
    {
        return "Bonjour {$user->name},\n\n"
            ."Un accès à l'espace de gestion Imaro vient d'être créé pour vous.\n\n"
            ."Identifiant (email) : {$user->email}\n"
            ."Mot de passe temporaire : {$password}\n\n"
            ."Connectez-vous sur l'application Imaro. À la première connexion, "
            ."vous serez invité à définir votre propre mot de passe.\n\n"
            .'— L\'équipe Imaro';
    }
}
