<?php

use App\Models\Residence;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Role;

uses(RefreshDatabase::class);

beforeEach(function () {
    foreach (['super_admin', 'manager'] as $r) {
        Role::firstOrCreate(['name' => $r, 'guard_name' => 'web']);
    }

    $this->digitoyou = Tenant::create(['name' => 'Digitoyou', 'email' => 'ops@imaro.ma', 'subdomain' => 'ops', 'plan' => 'enterprise', 'status' => 'active']);
    $this->admin = User::create(['tenant_id' => $this->digitoyou->id, 'name' => 'Admin', 'phone' => '+212600000000', 'role' => 'super_admin', 'status' => 'active']);
    $this->admin->assignRole('super_admin');
    $this->auth = ['Authorization' => 'Bearer '.$this->admin->createToken('t')->plainTextToken];

    // Deux clients de test.
    $this->clientA = Tenant::create(['name' => 'Gest Syndic A', 'email' => 'a@a.ma', 'subdomain' => 'a', 'plan' => 'business', 'status' => 'active']);
    $this->clientB = Tenant::create(['name' => 'Cabinet B', 'email' => 'b@b.ma', 'subdomain' => 'b', 'plan' => 'starter', 'status' => 'trial', 'trial_ends_at' => now()->addDays(3)]);
    Residence::withoutGlobalScope('tenant')->create(['tenant_id' => $this->clientA->id, 'name' => 'R1', 'address' => 'X', 'city' => 'Casa', 'total_tantieme' => 1000, 'nb_lots' => 0, 'status' => 'active', 'mode_cotisation' => 'tantieme']);
});

it('liste les clients avec compteurs (super_admin)', function () {
    $this->withHeaders($this->auth)->getJson('/api/admin/tenants')
        ->assertStatus(200)
        ->assertJsonPath('data.tenants.0.nb_residences', fn ($v) => is_int($v));

    $noms = collect($this->getJson('/api/admin/tenants', $this->auth)->json('data.tenants'))->pluck('name');
    expect($noms)->toContain('Gest Syndic A', 'Cabinet B');
});

it('filtre par statut', function () {
    $this->withHeaders($this->auth)->getJson('/api/admin/tenants?status=trial')
        ->assertStatus(200)
        ->assertJsonCount(1, 'data.tenants')
        ->assertJsonPath('data.tenants.0.name', 'Cabinet B');
});

it('métriques globales', function () {
    $this->withHeaders($this->auth)->getJson('/api/admin/metrics')
        ->assertStatus(200)
        ->assertJsonPath('data.clients.total', 3)     // digitoyou + A + B
        ->assertJsonPath('data.clients.essai', 1)
        ->assertJsonPath('data.parc.residences', 1)
        ->assertJsonPath('data.essais_expirant_7j', 1);
});

it('suspend puis réactive un client', function () {
    $this->withHeaders($this->auth)->postJson("/api/admin/tenants/{$this->clientA->id}/suspend")
        ->assertStatus(200)->assertJsonPath('data.tenant.status', 'suspended');
    expect($this->clientA->fresh()->status)->toBe('suspended');

    $this->withHeaders($this->auth)->postJson("/api/admin/tenants/{$this->clientA->id}/activate")
        ->assertStatus(200)->assertJsonPath('data.tenant.status', 'active');
});

it('change le plan et prolonge l\'essai', function () {
    $this->withHeaders($this->auth)->putJson("/api/admin/tenants/{$this->clientB->id}", ['plan' => 'pro'])
        ->assertStatus(200)->assertJsonPath('data.tenant.plan', 'pro');

    $this->withHeaders($this->auth)->postJson("/api/admin/tenants/{$this->clientB->id}/extend-trial", ['jours' => 30])
        ->assertStatus(200);
    expect($this->clientB->fresh()->trial_ends_at->isAfter(now()->addDays(20)))->toBeTrue();
});

it('un non super_admin est refusé (403)', function () {
    $mgr = User::create(['tenant_id' => $this->clientA->id, 'name' => 'Mgr', 'phone' => '+212600000009', 'role' => 'manager', 'status' => 'active']);
    $mgr->assignRole('manager');
    $mgrAuth = ['Authorization' => 'Bearer '.$mgr->createToken('t')->plainTextToken];

    $this->withHeaders($mgrAuth)->getJson('/api/admin/tenants')->assertStatus(403);
});
