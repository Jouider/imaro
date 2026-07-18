<?php

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
    $this->admin = User::create(['tenant_id' => $this->digitoyou->id, 'name' => 'Admin', 'email' => 'admin@imaro.ma', 'phone' => '+212600000000', 'role' => 'super_admin', 'status' => 'active']);
    $this->admin->assignRole('super_admin');
    $this->auth = ['Authorization' => 'Bearer '.$this->admin->createToken('t')->plainTextToken];
});

it('liste les membres super_admin', function () {
    $this->withHeaders($this->auth)->getJson('/api/admin/security/members')
        ->assertStatus(200)
        ->assertJsonPath('data.0.email', 'admin@imaro.ma')
        ->assertJsonPath('data.0.two_factor_enabled', false);
});

it('invite un membre et renvoie un mot de passe temporaire', function () {
    $res = $this->withHeaders($this->auth)->postJson('/api/admin/security/members', [
        'name' => 'Nouveau Admin',
        'email' => 'new@imaro.ma',
    ])->assertStatus(201)->assertJsonPath('data.email', 'new@imaro.ma');

    expect($res->json('data.temp_password'))->toBeString();
    $created = User::where('email', 'new@imaro.ma')->firstOrFail();
    expect($created->hasRole('super_admin'))->toBeTrue();
});

it('refuse de révoquer le dernier administrateur', function () {
    $this->withHeaders($this->auth)->deleteJson("/api/admin/security/members/{$this->admin->id}")
        ->assertStatus(422);
});

it('révoque un second membre', function () {
    $other = User::create(['tenant_id' => $this->digitoyou->id, 'name' => 'Autre', 'email' => 'other@imaro.ma', 'phone' => '+212600000002', 'role' => 'super_admin', 'status' => 'active']);
    $other->assignRole('super_admin');

    $this->withHeaders($this->auth)->deleteJson("/api/admin/security/members/{$other->id}")
        ->assertStatus(200);
    expect($other->fresh()->status)->toBe('inactive');
    expect($other->fresh()->hasRole('super_admin'))->toBeFalse();
});

it('un non super_admin est refusé (403)', function () {
    $mgr = User::create(['tenant_id' => $this->digitoyou->id, 'name' => 'Mgr', 'email' => 'mgr@x.ma', 'phone' => '+212600000009', 'role' => 'manager', 'status' => 'active']);
    $mgr->assignRole('manager');
    $mgrAuth = ['Authorization' => 'Bearer '.$mgr->createToken('t')->plainTextToken];

    $this->withHeaders($mgrAuth)->getJson('/api/admin/security/members')->assertStatus(403);
});
