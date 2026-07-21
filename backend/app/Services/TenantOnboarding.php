<?php

namespace App\Services;

use App\Models\Tenant;
use App\Models\User;
use App\Services\Notifications\TenantOwnerWelcomeNotifier;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

/**
 * Onboarding d'un cabinet : crée le compte responsable (manager) avec un mot de
 * passe temporaire et lui envoie ses identifiants par email (KAN-138). Partagé
 * entre la création manuelle d'un cabinet et la conversion d'un lead.
 */
class TenantOnboarding
{
    public function __construct(private readonly TenantOwnerWelcomeNotifier $notifier) {}

    /**
     * Crée le manager propriétaire du cabinet + envoie l'email de bienvenue.
     *
     * @return array{user: User, temp_password: string}
     */
    public function createOwner(Tenant $tenant, string $name, string $email): array
    {
        $password = Str::password(14);

        $user = User::create([
            'tenant_id' => $tenant->id,
            'name' => $name,
            'email' => $email,
            'password' => Hash::make($password),
            'role' => 'manager',
            'status' => 'active',
            'must_change_password' => true,
        ]);
        $user->assignRole('manager');

        $this->notifier->send($user, $tenant, $password);

        return ['user' => $user, 'temp_password' => $password];
    }
}
