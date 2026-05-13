<?php

use App\Models\Lot;
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
});

// ─── Dashboard ───────────────────────────────────────────────────────────────

it('returns dashboard KPIs for gestionnaire', function () {
    $this->withHeaders(['Authorization' => "Bearer {$this->token}"])
        ->getJson('/api/gestionnaire/dashboard')
        ->assertStatus(200)
        ->assertJsonPath('status', 'success')
        ->assertJsonStructure(['data' => [
            'residences_count', 'lots_count', 'taux_recouvrement',
            'montant_recouvre', 'montant_restant', 'tickets_ouverts',
            'tickets_urgents', 'appels_fonds_actifs',
        ]]);
});

// ─── Residences ──────────────────────────────────────────────────────────────

it('lists only residences assigned to the gestionnaire', function () {
    // Another gestionnaire — should not see this residence
    $other = User::create([
        'tenant_id' => $this->tenant->id,
        'name'      => 'Autre Gestionnaire',
        'phone'     => '+212611000002',
        'role'      => 'gestionnaire',
        'status'    => 'active',
    ]);
    Residence::withoutGlobalScopes()->create([
        'tenant_id'       => $this->tenant->id,
        'gestionnaire_id' => $other->id,
        'name'            => 'Résidence Autre',
        'address'         => 'Rue X',
        'city'            => 'Rabat',
        'total_tantieme'  => 1000,
        'nb_lots'         => 0,
        'status'          => 'active',
    ]);

    $response = $this->withHeaders(['Authorization' => "Bearer {$this->token}"])
        ->getJson('/api/gestionnaire/residences')
        ->assertStatus(200)
        ->assertJsonPath('status', 'success');

    expect($response->json('data.residences'))->toHaveCount(1)
        ->and($response->json('data.residences.0.name'))->toBe('Résidence Test');
});

it('shows a residence detail with lots', function () {
    Lot::create([
        'tenant_id'    => $this->tenant->id,
        'residence_id' => $this->residence->id,
        'numero'       => 'A01',
        'type'         => 'appartement',
        'etage'        => 1,
        'tantieme'     => 50,
    ]);

    $this->withHeaders(['Authorization' => "Bearer {$this->token}"])
        ->getJson("/api/gestionnaire/residences/{$this->residence->id}")
        ->assertStatus(200)
        ->assertJsonPath('data.residence.name', 'Résidence Test');
});

it('returns 403 when accessing a residence not assigned to gestionnaire', function () {
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

    $this->withHeaders(['Authorization' => "Bearer {$this->token}"])
        ->getJson("/api/gestionnaire/residences/{$otherResidence->id}")
        ->assertStatus(403);
});

it('updates residence info', function () {
    $this->withHeaders(['Authorization' => "Bearer {$this->token}"])
        ->putJson("/api/gestionnaire/residences/{$this->residence->id}", [
            'city' => 'Marrakech',
        ])
        ->assertStatus(200)
        ->assertJsonPath('data.residence.city', 'Marrakech');
});

// ─── Lots ────────────────────────────────────────────────────────────────────

it('creates a lot and validates tantieme budget', function () {
    $this->withHeaders(['Authorization' => "Bearer {$this->token}"])
        ->postJson("/api/gestionnaire/residences/{$this->residence->id}/lots", [
            'numero'    => 'A01',
            'type'      => 'appartement',
            'etage'     => 1,
            'tantieme'  => 500,
        ])
        ->assertStatus(201)
        ->assertJsonPath('data.lot.numero', 'A01');

    expect($this->residence->fresh()->nb_lots)->toBe(1);
});

it('rejects lot creation when tantieme would exceed total', function () {
    // Fill 900 / 1000
    Lot::create([
        'tenant_id'    => $this->tenant->id,
        'residence_id' => $this->residence->id,
        'numero'       => 'A01',
        'type'         => 'appartement',
        'etage'        => 0,
        'tantieme'     => 900,
    ]);

    $this->withHeaders(['Authorization' => "Bearer {$this->token}"])
        ->postJson("/api/gestionnaire/residences/{$this->residence->id}/lots", [
            'numero'   => 'A02',
            'type'     => 'appartement',
            'etage'    => 1,
            'tantieme' => 200, // would make 1100 > 1000
        ])
        ->assertStatus(422)
        ->assertJsonPath('status', 'error');
});

it('updates a lot tantieme', function () {
    $lot = Lot::create([
        'tenant_id'    => $this->tenant->id,
        'residence_id' => $this->residence->id,
        'numero'       => 'B01',
        'type'         => 'parking',
        'etage'        => 0,
        'tantieme'     => 50,
    ]);

    $this->withHeaders(['Authorization' => "Bearer {$this->token}"])
        ->putJson("/api/gestionnaire/residences/{$this->residence->id}/lots/{$lot->id}", [
            'tantieme' => 60,
        ])
        ->assertStatus(200)
        ->assertJsonPath('data.lot.tantieme', 60);
});

it('lists lots for a residence', function () {
    Lot::create(['tenant_id' => $this->tenant->id, 'residence_id' => $this->residence->id, 'numero' => 'C01', 'type' => 'appartement', 'etage' => 2, 'tantieme' => 45]);
    Lot::create(['tenant_id' => $this->tenant->id, 'residence_id' => $this->residence->id, 'numero' => 'C02', 'type' => 'appartement', 'etage' => 2, 'tantieme' => 55]);

    $response = $this->withHeaders(['Authorization' => "Bearer {$this->token}"])
        ->getJson("/api/gestionnaire/residences/{$this->residence->id}/lots")
        ->assertStatus(200);

    expect($response->json('data.lots'))->toHaveCount(2)
        ->and($response->json('data.sum_tantieme'))->toEqual(100);
});

it('requires auth to access gestionnaire routes', function () {
    $this->getJson('/api/gestionnaire/residences')
        ->assertStatus(401);
});
