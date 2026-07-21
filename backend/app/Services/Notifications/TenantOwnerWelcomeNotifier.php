<?php

namespace App\Services\Notifications;

use App\Contracts\Notifications\NotificationChannel;
use App\Contracts\Notifications\NotificationMessage;
use App\Contracts\Notifications\NotificationResult;
use App\Models\Tenant;
use App\Models\User;
use App\Notifications\NotificationManager;

/**
 * Email de bienvenue au responsable (manager) d'un cabinet fraîchement créé —
 * onboarding / démo (KAN-138). Contient l'adresse de l'espace, l'identifiant et
 * le mot de passe temporaire. Canal email uniquement (les admins se connectent
 * avec email + mot de passe). À la première connexion : choix du mot de passe
 * définitif puis activation 2FA.
 */
class TenantOwnerWelcomeNotifier
{
    private const TEMPLATE = 'tenant_owner_welcome';

    public function __construct(private readonly NotificationManager $notifier) {}

    public function send(User $user, Tenant $tenant, string $tempPassword): NotificationResult
    {
        return $this->notifier->send(new NotificationMessage(
            to: $user,
            channel: NotificationChannel::Email,
            templateName: self::TEMPLATE,
            body: $this->body($user, $tenant, $tempPassword),
            subject: 'Bienvenue sur Imaro — votre accès syndic',
        ));
    }

    private function body(User $user, Tenant $tenant, string $password): string
    {
        $url = "https://{$tenant->subdomain}.imaro.ma";

        return "Bonjour {$user->name},\n\n"
            ."Votre espace syndic Imaro « {$tenant->name} » est prêt.\n\n"
            ."Adresse : {$url}\n"
            ."Identifiant (email) : {$user->email}\n"
            ."Mot de passe temporaire : {$password}\n\n"
            ."À la première connexion, vous choisirez votre propre mot de passe, "
            ."puis vous activerez la double authentification.\n\n"
            .'— L\'équipe Imaro';
    }
}
