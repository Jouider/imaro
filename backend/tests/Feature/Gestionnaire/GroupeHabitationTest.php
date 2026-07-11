<?php

use App\Models\GroupeHabitation;
use App\Models\Immeuble;
use App\Models\Residence;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Role;

uses(RefreshDatabase::class);

beforeEach(function () {
    foreach (['super_admin', 'manager', 'gestionnaire', 'agent_recouvrement', 'conseil', 'resident'] as $role) {
        Role::firstOrCreate(['name' => $role, 'guard_name' => 'web']);
    }

    $this->tenant = Tenant::create([
        'name'      => 'Test Syndic',
        'email'     => 'test@syndic.ma',
        'subdomain' => 'test',
        'plan'      => 'starter',
        'status'    => 'active',
    ]);
    config(['app.tenant_id' => $this->tenant->id]);

    $this->gestionnaire = User::create([
        'tenant_id' => $this->tenant->id,
        'name'      => 'Youssef Gestionnaire',
        'phone'     => '+212611000001',
        'role'      => 'gestionnaire',
        'status'    => 'active',
    ]);
    $this->gestionnaire->assignRole('gestionnaire');

    $this->residence = Residence::withoutGlobalScopes()->create([
        'tenant_id'        => $this->tenant->id,
        'gestionnaire_id'  => $this->gestionnaire->id,
        'name'             => 'Résidence Test',
        'address'          => 'Bd Mohammed V',
        'city'             => 'Casablanca',
        'total_tantieme'   => 1000,
        'nb_lots'          => 0,
        'status'           => 'active',
    ]);

    $this->token = $this->gestionnaire->createToken('test')->plainTextToken;
    $this->headers = ['Authorization' => "Bearer {$this->token}"];
});

it('lists groupes habitations with nb_immeubles count', function () {
    $gh = GroupeHabitation::create([
        'tenant_id'    => $this->tenant->id,
        'residence_id' => $this->residence->id,
        'nom'          => 'Tranche A',
        'code'         => 'TA',
    ]);
    Immeuble::create([
        'tenant_id'            => $this->tenant->id,
        'residence_id'         => $this->residence->id,
        'groupe_habitation_id' => $gh->id,
        'nom'                  => 'Immeuble 1',
    ]);
    Immeuble::create([
        'tenant_id'            => $this->tenant->id,
        'residence_id'         => $this->residence->id,
        'groupe_habitation_id' => $gh->id,
        'nom'                  => 'Immeuble 2',
    ]);

    $this->withHeaders($this->headers)
        ->getJson("/api/gestionnaire/residences/{$this->residence->id}/groupes-habitations")
        ->assertStatus(200)
        ->assertJsonPath('data.groupes_habitations.0.nom', 'Tranche A')
        ->assertJsonPath('data.groupes_habitations.0.code', 'TA')
        ->assertJsonPath('data.groupes_habitations.0.residence_id', $this->residence->id)
        ->assertJsonPath('data.groupes_habitations.0.nb_immeubles', 2);
});

it('creates a groupe habitation with code', function () {
    $this->withHeaders($this->headers)
        ->postJson("/api/gestionnaire/residences/{$this->residence->id}/groupes-habitations", [
            'nom'  => 'Tranche Nord',
            'code' => 'TN',
        ])
        ->assertStatus(201)
        ->assertJsonPath('data.groupe_habitation.nom', 'Tranche Nord')
        ->assertJsonPath('data.groupe_habitation.code', 'TN')
        ->assertJsonPath('data.groupe_habitation.nb_immeubles', 0);
});

it('rejects duplicate code in same residence', function () {
    GroupeHabitation::create([
        'tenant_id'    => $this->tenant->id,
        'residence_id' => $this->residence->id,
        'nom'          => 'Tranche A',
        'code'         => 'TA',
    ]);

    $this->withHeaders($this->headers)
        ->postJson("/api/gestionnaire/residences/{$this->residence->id}/groupes-habitations", [
            'nom'  => 'Autre Tranche',
            'code' => 'TA',
        ])
        ->assertStatus(422);
});

it('updates a groupe habitation', function () {
    $gh = GroupeHabitation::create([
        'tenant_id'    => $this->tenant->id,
        'residence_id' => $this->residence->id,
        'nom'          => 'Tranche A',
        'code'         => 'TA',
    ]);

    $this->withHeaders($this->headers)
        ->putJson("/api/gestionnaire/residences/{$this->residence->id}/groupes-habitations/{$gh->id}", [
            'nom'  => 'Tranche A bis',
            'code' => 'TAB',
        ])
        ->assertStatus(200)
        ->assertJsonPath('data.groupe_habitation.nom', 'Tranche A bis')
        ->assertJsonPath('data.groupe_habitation.code', 'TAB');
});

it('deletes a groupe and nullifies linked immeubles', function () {
    $gh = GroupeHabitation::create([
        'tenant_id'    => $this->tenant->id,
        'residence_id' => $this->residence->id,
        'nom'          => 'Tranche A',
    ]);
    $immeuble = Immeuble::create([
        'tenant_id'            => $this->tenant->id,
        'residence_id'         => $this->residence->id,
        'groupe_habitation_id' => $gh->id,
        'nom'                  => 'Immeuble 1',
    ]);

    $this->withHeaders($this->headers)
        ->deleteJson("/api/gestionnaire/residences/{$this->residence->id}/groupes-habitations/{$gh->id}")
        ->assertStatus(200);

    expect(GroupeHabitation::find($gh->id))->toBeNull()
        ->and(Immeuble::find($immeuble->id)->groupe_habitation_id)->toBeNull();
});

it('returns 403 on residence not assigned to gestionnaire', function () {
    $other = User::create([
        'tenant_id' => $this->tenant->id,
        'name'      => 'Autre',
        'phone'     => '+212611000003',
        'role'      => 'gestionnaire',
        'status'    => 'active',
    ]);
    $otherResidence = Residence::withoutGlobalScopes()->create([
        'tenant_id'       => $this->tenant->id,
        'gestionnaire_id' => $other->id,
        'name'            => 'Résidence Autre',
        'address'         => 'Rue Y',
        'city'            => 'Fès',
        'total_tantieme'  => 1000,
        'nb_lots'         => 0,
        'status'          => 'active',
    ]);

    $this->withHeaders($this->headers)
        ->getJson("/api/gestionnaire/residences/{$otherResidence->id}/groupes-habitations")
        ->assertStatus(403);
});
