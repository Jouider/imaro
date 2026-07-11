<?php

use App\Models\Residence;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Role;

uses(RefreshDatabase::class);

beforeEach(function () {
    Role::firstOrCreate(['name' => 'manager', 'guard_name' => 'web']);

    $this->tenant = Tenant::create(['name' => 'T', 'email' => 't@t.ma', 'subdomain' => 't', 'plan' => 'business', 'status' => 'active']);
    config(['app.tenant_id' => $this->tenant->id]);
    $this->manager = User::create(['tenant_id' => $this->tenant->id, 'name' => 'Mgr', 'phone' => '+212600000001', 'role' => 'manager', 'status' => 'active']);
    $this->manager->assignRole('manager');
    $this->auth = ['Authorization' => 'Bearer '.$this->manager->createToken('t')->plainTextToken];
});

it('crée une résidence avec une périodicité de cotisation (KAN-86)', function () {
    $this->withHeaders($this->auth)->postJson('/api/gestionnaire/residences', [
        'name' => 'Atlas', 'city' => 'Casa', 'mode_cotisation' => 'tantieme',
        'periodicite_cotisation' => 'mensuel',
    ])->assertStatus(201)
        ->assertJsonPath('data.periodicite_cotisation', 'mensuel');

    expect(Residence::withoutGlobalScope('tenant')->first()->periodicite_cotisation)->toBe('mensuel');
});

it('défaut « trimestriel » si la périodicité est omise', function () {
    $this->withHeaders($this->auth)->postJson('/api/gestionnaire/residences', [
        'name' => 'Sans périodicité', 'city' => 'Rabat', 'mode_cotisation' => 'tantieme',
    ])->assertStatus(201)
        ->assertJsonPath('data.periodicite_cotisation', 'trimestriel');
});

it('met à jour la périodicité', function () {
    $res = Residence::withoutGlobalScope('tenant')->create([
        'tenant_id' => $this->tenant->id, 'gestionnaire_id' => $this->manager->id, 'name' => 'Atlas',
        'address' => 'X', 'city' => 'Casa', 'total_tantieme' => 1000, 'nb_lots' => 0, 'status' => 'active',
        'mode_cotisation' => 'tantieme',
    ]);

    $this->withHeaders($this->auth)->putJson("/api/gestionnaire/residences/{$res->id}", [
        'periodicite_cotisation' => 'annuel',
    ])->assertStatus(200)->assertJsonPath('data.periodicite_cotisation', 'annuel');
});

it('refuse une périodicité invalide (422)', function () {
    $this->withHeaders($this->auth)->postJson('/api/gestionnaire/residences', [
        'name' => 'X', 'city' => 'Casa', 'mode_cotisation' => 'tantieme',
        'periodicite_cotisation' => 'hebdomadaire',
    ])->assertStatus(422)->assertJsonValidationErrors(['periodicite_cotisation']);
});
