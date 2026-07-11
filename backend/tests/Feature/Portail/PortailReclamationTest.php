<?php

use App\Models\Coproprietaire;
use App\Models\Immeuble;
use App\Models\Lot;
use App\Models\Residence;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Role;

uses(RefreshDatabase::class);

beforeEach(function () {
    foreach (['gestionnaire', 'resident'] as $r) {
        Role::firstOrCreate(['name' => $r, 'guard_name' => 'web']);
    }

    $this->tenant = Tenant::create(['name' => 'T', 'email' => 't@t.ma', 'subdomain' => 't', 'plan' => 'starter', 'status' => 'active']);

    $gest = User::create(['tenant_id' => $this->tenant->id, 'name' => 'Gest', 'phone' => '+212600000001', 'role' => 'gestionnaire', 'status' => 'active']);
    $this->residence = Residence::withoutGlobalScope('tenant')->create([
        'tenant_id' => $this->tenant->id, 'gestionnaire_id' => $gest->id, 'name' => 'Aqualina',
        'address' => 'X', 'city' => 'Casa', 'total_tantieme' => 1000, 'nb_lots' => 1, 'status' => 'active', 'mode_cotisation' => 'tantieme',
    ]);
    $imm = Immeuble::withoutGlobalScope('tenant')->create(['tenant_id' => $this->tenant->id, 'residence_id' => $this->residence->id, 'nom' => 'A', 'nb_etages' => 1, 'nb_lots' => 1]);
    $lot = Lot::withoutGlobalScope('tenant')->create(['tenant_id' => $this->tenant->id, 'residence_id' => $this->residence->id, 'immeuble_id' => $imm->id, 'numero' => 'A1', 'type' => 'appartement', 'etage' => 2, 'tantieme' => 1000]);

    $this->resident = User::create(['tenant_id' => $this->tenant->id, 'name' => 'Hassan', 'phone' => '+212611111111', 'role' => 'resident', 'status' => 'active', 'password' => bcrypt('x')]);
    $this->resident->assignRole('resident');
    Coproprietaire::create(['tenant_id' => $this->tenant->id, 'user_id' => $this->resident->id, 'lot_id' => $lot->id, 'type' => 'proprietaire', 'solde_actuel' => 0]);

    $this->auth = ['Authorization' => 'Bearer '.$this->resident->createToken('t')->plainTextToken];
});

it('accepts a reclamation with an extended KAN-55 category (parking)', function () {
    $this->withHeaders($this->auth)
        ->postJson('/api/portail/reclamations', [
            'sujet'       => 'Voiture mal garée',
            'description' => 'Une voiture bloque la sortie du parking sous-sol',
            'categorie'   => 'parking',
            'priorite'    => 'normale',
        ])
        ->assertStatus(201)
        ->assertJsonPath('status', 'success');

    $this->assertDatabaseHas('tickets', [
        'user_id'   => $this->resident->id,
        'categorie' => 'parking',
    ]);
});

it('rejects a reclamation with an unknown category', function () {
    $this->withHeaders($this->auth)
        ->postJson('/api/portail/reclamations', [
            'description' => 'Description de la réclamation',
            'categorie'   => 'pas_une_categorie',
        ])
        ->assertStatus(422)
        ->assertJsonValidationErrors('categorie');
});
