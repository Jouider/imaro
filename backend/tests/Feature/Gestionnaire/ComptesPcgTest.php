<?php

use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Role;

uses(RefreshDatabase::class);

it('comptes-pcg renvoie un plan comptable complet (classes 1,3,4,5,6,7)', function () {
    Role::firstOrCreate(['name' => 'manager', 'guard_name' => 'web']);
    $tenant = Tenant::create(['name' => 'T', 'email' => 't@t.ma', 'subdomain' => 't', 'plan' => 'business', 'status' => 'active']);
    config(['app.tenant_id' => $tenant->id]);
    $manager = User::create(['tenant_id' => $tenant->id, 'name' => 'Mgr', 'phone' => '+212600000001', 'role' => 'manager', 'status' => 'active']);
    $manager->assignRole('manager');
    $auth = ['Authorization' => 'Bearer '.$manager->createToken('t')->plainTextToken];

    $data = $this->withHeaders($auth)->getJson('/api/gestionnaire/comptes-pcg')
        ->assertStatus(200)
        ->json('data');

    // Plan complet : nettement plus que les 24 comptes d'origine.
    expect(count($data))->toBeGreaterThanOrEqual(40);

    // Les classes du Décret 2.23.700 sont représentées — dont la classe 2
    // (immobilisations : installations/équipements, amortissements — KAN-130).
    $classes = collect($data)->pluck('classe')->unique()->sort()->values()->all();
    expect($classes)->toBe([1, 2, 3, 4, 5, 6, 7]);

    // Quelques comptes clés jusqu'ici manquants doivent être présents.
    $numeros = collect($data)->pluck('numero')->all();
    foreach (['6111', '6132', '6182', '7062', '4411', '5141'] as $n) {
        expect($numeros)->toContain($n);
    }

    // Shape consommée par le front.
    foreach ($data as $c) {
        expect($c)->toHaveKeys(['numero', 'libelle', 'classe']);
        expect($c['numero'])->toBeString();
    }
});
