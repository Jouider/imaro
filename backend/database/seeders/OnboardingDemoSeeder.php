<?php

namespace Database\Seeders;

use App\Models\Tenant;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Role;

/**
 * Démo VIDE « Demo Syndic » — pour tester le parcours d'ONBOARDING de zéro.
 *
 * Crée uniquement le cabinet (tenant) + son manager. Aucune résidence, aucun lot,
 * aucun copropriétaire : tout doit être créé via l'UI pour exercer l'onboarding
 * (onboarding_completed_at = null → le flux se déclenche à la 1re connexion).
 *
 *   php artisan db:seed --class=OnboardingDemoSeeder
 *
 * Connexion manager : manager@demosyndic.ma / Demo2026!
 */
class OnboardingDemoSeeder extends Seeder
{
    public function run(): void
    {
        if (Tenant::where('subdomain', 'demosyndic')->exists()) {
            $this->command->warn('Tenant « demosyndic » déjà présent — seed ignoré (purge d\'abord).');

            return;
        }

        $tenant = Tenant::create([
            'name' => 'Demo Syndic', 'email' => 'contact@demosyndic.ma', 'phone' => '+212522900001',
            'plan' => 'starter', 'max_logins' => 50, 'subdomain' => 'demosyndic', 'status' => 'active',
            'trial_ends_at' => Carbon::now()->addDays(14),
            'onboarding_completed_at' => null,   // onboarding NON terminé → flux à tester
            'onboarding_step' => 0,
        ]);

        config(['app.tenant_id' => $tenant->id]);

        Role::firstOrCreate(['name' => 'manager', 'guard_name' => 'web']);

        $manager = User::create([
            'tenant_id' => $tenant->id,
            'name' => 'Demo Manager',
            'phone' => '+212700009001',
            'email' => 'manager@demosyndic.ma',
            'password' => bcrypt('Demo2026!'),
            'role' => 'manager',
            'status' => 'active',
        ]);
        $manager->assignRole('manager');

        $this->command->info('✅ Cabinet vide « Demo Syndic » créé (subdomain: demosyndic).');
        $this->command->info('   Manager : manager@demosyndic.ma / Demo2026!');
    }
}
