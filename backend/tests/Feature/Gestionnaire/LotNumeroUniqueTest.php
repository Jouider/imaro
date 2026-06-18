<?php

use App\Models\Immeuble;
use App\Models\Lot;
use App\Models\Residence;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Role;

uses(RefreshDatabase::class);

beforeEach(function () {
    foreach (['manager', 'gestionnaire', 'conseil', 'resident'] as $role) {
        Role::firstOrCreate(['name' => $role, 'guard_name' => 'web']);
    }

    $this->tenant = Tenant::create(['name' => 'T', 'email' => 't@t.ma', 'subdomain' => 't', 'plan' => 'starter', 'status' => 'active']);
    config(['app.tenant_id' => $this->tenant->id]);

    $this->gest = User::create(['tenant_id' => $this->tenant->id, 'name' => 'Gest', 'phone' => '+212611000001', 'role' => 'gestionnaire', 'status' => 'active']);
    $this->gest->assignRole('gestionnaire');

    $this->residence = Residence::withoutGlobalScopes()->create([
        'tenant_id' => $this->tenant->id, 'gestionnaire_id' => $this->gest->id, 'name' => 'Atlas',
        'address' => 'X', 'city' => 'Casa', 'total_tantieme' => 1000, 'nb_lots' => 0, 'status' => 'active', 'mode_cotisation' => 'tantieme',
    ]);
    $this->immeubleA = Immeuble::withoutGlobalScopes()->create(['tenant_id' => $this->tenant->id, 'residence_id' => $this->residence->id, 'nom' => 'A', 'nb_etages' => 5, 'nb_lots' => 0]);
    $this->immeubleB = Immeuble::withoutGlobalScopes()->create(['tenant_id' => $this->tenant->id, 'residence_id' => $this->residence->id, 'nom' => 'B', 'nb_etages' => 5, 'nb_lots' => 0]);

    $this->auth = ['Authorization' => 'Bearer '.$this->gest->createToken('t')->plainTextToken];

    $this->makeLot = fn (string $numero, ?int $immeubleId = null) => Lot::create([
        'tenant_id' => $this->tenant->id, 'residence_id' => $this->residence->id,
        'immeuble_id' => $immeubleId ?? $this->immeubleA->id, 'numero' => $numero,
        'type' => 'appartement', 'etage' => 1, 'tantieme' => 50,
    ]);

    $this->store = fn (array $payload) => $this->withHeaders($this->auth)
        ->postJson("/api/gestionnaire/residences/{$this->residence->id}/lots", array_merge([
            'type' => 'appartement', 'etage' => 1, 'tantieme' => 50, 'immeuble_id' => $this->immeubleA->id,
        ], $payload));
});

it('rejette (422) un numéro de lot déjà pris dans la résidence', function () {
    ($this->makeLot)('A01');

    ($this->store)(['numero' => 'A01'])
        ->assertStatus(422)
        ->assertJsonPath('errors.numero.0', 'Ce numéro de lot existe déjà dans cette résidence.');
});

it('rejette aussi un doublon dans un autre immeuble de la même résidence', function () {
    ($this->makeLot)('A01', $this->immeubleA->id);

    // même numéro, immeuble B → interdit (unicité par résidence, pas par immeuble)
    ($this->store)(['numero' => 'A01', 'immeuble_id' => $this->immeubleB->id])
        ->assertStatus(422);
});

it('normalise le numéro (trim) avant la comparaison', function () {
    ($this->makeLot)('A01');

    ($this->store)(['numero' => '  A01  '])->assertStatus(422);
});

it('accepte un numéro inédit dans la résidence', function () {
    ($this->makeLot)('A01');

    ($this->store)(['numero' => 'A02'])->assertStatus(201);
});
