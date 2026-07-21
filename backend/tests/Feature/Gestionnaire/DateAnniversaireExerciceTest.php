<?php

use App\Models\Exercice;
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

function residence(array $attrs = []): Residence
{
    return Residence::withoutGlobalScope('tenant')->create(array_merge([
        'tenant_id' => test()->tenant->id, 'gestionnaire_id' => test()->manager->id, 'name' => 'Atlas',
        'address' => 'X', 'city' => 'Casa', 'total_tantieme' => 1000, 'nb_lots' => 0, 'status' => 'active',
        'mode_cotisation' => 'tantieme',
    ], $attrs));
}

it('crée/expose la date d\'anniversaire de la résidence (KAN-95)', function () {
    $this->withHeaders($this->auth)->postJson('/api/gestionnaire/residences', [
        'name' => 'Atlas', 'city' => 'Casa', 'mode_cotisation' => 'tantieme',
        'date_anniversaire' => '2025-03-15',
    ])->assertStatus(201)
        ->assertJsonPath('data.date_anniversaire', '2025-03-15');
});

it('exercice = 12 mois glissants depuis la date d\'anniversaire (dates auto)', function () {
    $res = residence(['date_anniversaire' => '2025-03-15']);

    $this->withHeaders($this->auth)->postJson("/api/gestionnaire/residences/{$res->id}/exercices", [
        'annee' => 2026,
    ])->assertStatus(201);

    $ex = Exercice::withoutGlobalScope('tenant')->where('residence_id', $res->id)->first();
    expect($ex->date_debut->toDateString())->toBe('2026-03-15')
        ->and($ex->date_fin->toDateString())->toBe('2027-03-14');
});

it('sans date d\'anniversaire → exercice au 1er janvier (compat ascendante)', function () {
    $res = residence(); // pas de date_anniversaire

    $this->withHeaders($this->auth)->postJson("/api/gestionnaire/residences/{$res->id}/exercices", [
        'annee' => 2026,
    ])->assertStatus(201);

    $ex = Exercice::withoutGlobalScope('tenant')->where('residence_id', $res->id)->first();
    expect($ex->date_debut->toDateString())->toBe('2026-01-01')
        ->and($ex->date_fin->toDateString())->toBe('2026-12-31');
});

it('des dates explicites restent prioritaires (rétro-compat)', function () {
    $res = residence(['date_anniversaire' => '2025-03-15']);

    $this->withHeaders($this->auth)->postJson("/api/gestionnaire/residences/{$res->id}/exercices", [
        'annee' => 2026, 'date_debut' => '2026-02-01', 'date_fin' => '2026-12-31',
    ])->assertStatus(201);

    $ex = Exercice::withoutGlobalScope('tenant')->where('residence_id', $res->id)->first();
    expect($ex->date_debut->toDateString())->toBe('2026-02-01');
});
