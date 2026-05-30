<?php

namespace Database\Seeders;

use App\Models\Tenant;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Spatie\Permission\Models\Role;

/**
 * Crée le tenant + compte manager pour la beta test de Mohammed Fikri.
 *
 * Idempotent : peut être ré-exécuté sans effet de bord (firstOrCreate partout).
 * N'ajoute AUCUNE résidence / lot / paiement — le test démarre vraiment de zéro.
 */
class FikriBetaSeeder extends Seeder
{
    public function run(): void
    {
        foreach (['super_admin', 'manager', 'gestionnaire', 'agent_recouvrement', 'conseil', 'resident'] as $roleName) {
            Role::firstOrCreate(['name' => $roleName, 'guard_name' => 'web']);
        }

        $tenant = Tenant::firstOrCreate(
            ['subdomain' => 'blancasyndic-test'],
            [
                'name'       => 'BlancaSyndic Beta',
                'email'      => 'beta@blancasyndic.ma',
                'phone'      => '+212522990001',
                'plan'       => 'business',
                'max_logins' => 50,
                'rc'         => 'RC-BETA-TEST',
                'status'     => 'active',
            ]
        );

        $fikri = User::firstOrCreate(
            ['phone' => '+212600000099'],
            [
                'tenant_id' => $tenant->id,
                'name'      => 'Mohammed Fikri',
                'email'     => 'fikri-beta@blancasyndic.ma',
                'password'  => Hash::make('imaro2026'),
                'role'      => 'manager',
                'status'    => 'active',
                'lang'      => 'fr',
            ]
        );

        if (! $fikri->hasRole('manager')) {
            $fikri->assignRole('manager');
        }

        $this->command->info('');
        $this->command->info('╔════════════════════════════════════════════════════════════╗');
        $this->command->info('║  BETA TEST — MOHAMMED FIKRI / BLANCASYNDIC                ║');
        $this->command->info('╠════════════════════════════════════════════════════════════╣');
        $this->command->info("║  Tenant     : BlancaSyndic Beta (id={$tenant->id})");
        $this->command->info('║  Subdomain  : blancasyndic-test');
        $this->command->info("║  Manager    : Mohammed Fikri (id={$fikri->id})");
        $this->command->info('║  Phone      : +212600000099    (OTP WhatsApp)');
        $this->command->info('║  Email      : fikri-beta@blancasyndic.ma');
        $this->command->info('║  Password   : imaro2026         (fallback si OTP KO)');
        $this->command->info('║  Login URL  : https://staging.imaro.ma');
        $this->command->info('╚════════════════════════════════════════════════════════════╝');
        $this->command->info('');
    }
}
