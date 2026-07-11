<?php

use App\Models\Depense;
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
    $this->residence = Residence::withoutGlobalScope('tenant')->create(['tenant_id' => $this->tenant->id, 'gestionnaire_id' => $this->manager->id, 'name' => 'Atlas', 'address' => 'X', 'city' => 'Casa', 'total_tantieme' => 1000, 'nb_lots' => 1, 'status' => 'active', 'mode_cotisation' => 'tantieme']);
    $this->auth = ['Authorization' => 'Bearer '.$this->manager->createToken('t')->plainTextToken];
});

function exercice(string $statut): Exercice
{
    return Exercice::withoutGlobalScope('tenant')->create([
        'tenant_id' => test()->tenant->id, 'residence_id' => test()->residence->id, 'annee' => 2026,
        'date_debut' => '2026-01-01', 'date_fin' => '2026-12-31', 'statut' => $statut,
    ]);
}

it('bloque la création de dépense sur un exercice clôturé (422) — KAN-127', function () {
    $ex = exercice('cloture');

    $this->withHeaders($this->auth)->postJson('/api/gestionnaire/depenses-finance', [
        'exercice_id' => $ex->id, 'residence_id' => $this->residence->id,
        'titre' => 'Ascenseur', 'montant' => 1200, 'date' => '2026-06-10',
    ])->assertStatus(422);

    expect(Depense::withoutGlobalScope('tenant')->count())->toBe(0);
});

it('autorise la création de dépense sur un exercice actif (201)', function () {
    $ex = exercice('actif');

    $this->withHeaders($this->auth)->postJson('/api/gestionnaire/depenses-finance', [
        'exercice_id' => $ex->id, 'residence_id' => $this->residence->id,
        'titre' => 'Ascenseur', 'montant' => 1200, 'date' => '2026-06-10',
    ])->assertStatus(201);

    expect(Depense::withoutGlobalScope('tenant')->count())->toBe(1);
});
