<?php

/**
 * Régression : ordre_du_jour doit être renvoyé en CHAÎNE (le front fait le split).
 * (Avant : AssembleeResource l'explosait en tableau → s.ordre_du_jour.split crash.)
 */

use App\Models\Assemblee;
use App\Models\Residence;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Role;

uses(RefreshDatabase::class);

it('renvoie ordre_du_jour en chaîne brute', function () {
    foreach (['manager', 'gestionnaire'] as $r) {
        Role::firstOrCreate(['name' => $r, 'guard_name' => 'web']);
    }

    $tenant = Tenant::create(['name' => 'T', 'email' => 't@t.ma', 'subdomain' => 't', 'plan' => 'business', 'status' => 'active']);
    config(['app.tenant_id' => $tenant->id]);

    $manager = User::create(['tenant_id' => $tenant->id, 'name' => 'Fikri', 'phone' => '+212600000001', 'role' => 'manager', 'status' => 'active']);
    $manager->assignRole('manager');

    $residence = Residence::withoutGlobalScope('tenant')->create([
        'tenant_id' => $tenant->id, 'gestionnaire_id' => $manager->id, 'name' => 'Atlas',
        'address' => 'X', 'city' => 'Casa', 'total_tantieme' => 1000, 'nb_lots' => 0, 'status' => 'active',
    ]);

    $odj = "1. Comptes 2025\n2. Budget 2026";
    Assemblee::create([
        'tenant_id' => $tenant->id, 'residence_id' => $residence->id, 'created_by' => $manager->id,
        'titre' => 'AG 2026', 'type' => 'ordinaire', 'date' => '2026-07-15 10:00:00', 'lieu' => 'Salle',
        'quorum_requis' => 50, 'ordre_du_jour' => $odj, 'statut' => 'planifiee',
    ]);

    $auth = ['Authorization' => 'Bearer '.$manager->createToken('t')->plainTextToken];

    $res = $this->withHeaders($auth)->getJson('/api/gestionnaire/assemblees')->assertStatus(200);

    $value = $res->json('data.assemblees.0.ordre_du_jour');
    expect($value)->toBeString()->toBe($odj);
});
