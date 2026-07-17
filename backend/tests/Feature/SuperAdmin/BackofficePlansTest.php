<?php

use App\Models\Plan;
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
});

it('crée, liste, met à jour et supprime un plan (super_admin)', function () {
    // Créer
    $this->withHeaders($this->auth)->postJson('/api/admin/plans', [
        'slug' => 'business',
        'name' => 'Business',
        'price_dh' => 1200,
        'period' => 'mensuel',
        'quota_residences' => 20,
        'quota_lots' => 500,
        'quota_users' => 10,
        'features' => ['mobile', 'budgets_avances'],
        'is_active' => true,
    ])->assertStatus(201)->assertJsonPath('data.slug', 'business');

    $plan = Plan::where('slug', 'business')->firstOrFail();

    // Lister
    $this->withHeaders($this->auth)->getJson('/api/admin/plans')
        ->assertStatus(200)
        ->assertJsonPath('data.0.slug', 'business');

    // Mettre à jour
    $this->withHeaders($this->auth)->putJson("/api/admin/plans/{$plan->id}", [
        'slug' => 'business',
        'name' => 'Business Pro',
        'price_dh' => 1500,
        'period' => 'mensuel',
    ])->assertStatus(200)->assertJsonPath('data.price_dh', 1500);

    // Supprimer
    $this->withHeaders($this->auth)->deleteJson("/api/admin/plans/{$plan->id}")
        ->assertStatus(200);
    expect(Plan::count())->toBe(0);
});

it('rejette un slug dupliqué', function () {
    Plan::create(['slug' => 'starter', 'name' => 'Starter', 'price_dh' => 199, 'period' => 'mensuel']);

    $this->withHeaders($this->auth)->postJson('/api/admin/plans', [
        'slug' => 'starter', 'name' => 'Autre', 'price_dh' => 300, 'period' => 'mensuel',
    ])->assertStatus(422);
});

it('un non super_admin est refusé (403)', function () {
    $mgr = User::create(['tenant_id' => $this->digitoyou->id, 'name' => 'Mgr', 'phone' => '+212600000009', 'role' => 'manager', 'status' => 'active']);
    $mgr->assignRole('manager');
    $mgrAuth = ['Authorization' => 'Bearer '.$mgr->createToken('t')->plainTextToken];

    $this->withHeaders($mgrAuth)->getJson('/api/admin/plans')->assertStatus(403);
});
