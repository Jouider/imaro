<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Spatie\Permission\Models\Role;

/**
 * Compte super_admin par défaut pour le back-office Digitoyou (KAN-138).
 *
 * Identifiants de dev : admin@imaro.ma / Imaro@2026
 * ⚠️ À changer en production (ou via variables d'environnement dédiées).
 * super_admin n'est rattaché à aucun tenant (`tenant_id` null).
 */
class SuperAdminSeeder extends Seeder
{
    public function run(): void
    {
        Role::firstOrCreate(['name' => 'super_admin', 'guard_name' => 'web']);

        $admin = User::withoutGlobalScopes()->updateOrCreate(
            ['email' => 'admin@imaro.ma'],
            [
                'tenant_id' => null,
                'name' => 'Digitoyou Admin',
                'password' => Hash::make('Imaro@2026'),
                'role' => 'super_admin',
                'status' => 'active',
            ],
        );

        if (! $admin->hasRole('super_admin')) {
            $admin->assignRole('super_admin');
        }
    }
}
