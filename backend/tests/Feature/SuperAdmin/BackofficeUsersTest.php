<?php

use App\Models\AuditLog;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Role;

uses(RefreshDatabase::class);

beforeEach(function () {
    foreach (['super_admin', 'manager'] as $r) {
        Role::firstOrCreate(['name' => $r, 'guard_name' => 'web']);
    }

    $ops = Tenant::create(['name' => 'Digitoyou', 'email' => 'ops@imaro.ma', 'subdomain' => 'ops', 'plan' => 'enterprise', 'status' => 'active']);
    $this->admin = User::create(['tenant_id' => $ops->id, 'name' => 'Admin', 'phone' => '+212600000000', 'role' => 'super_admin', 'status' => 'active']);
    $this->admin->assignRole('super_admin');
    $this->auth = ['Authorization' => 'Bearer '.$this->admin->createToken('t')->plainTextToken];

    $this->tenant = Tenant::create(['name' => 'Gest Syndic A', 'email' => 'a@a.ma', 'subdomain' => 'a', 'plan' => 'business', 'status' => 'active']);
    $this->manager = User::create(['tenant_id' => $this->tenant->id, 'name' => 'Mohammed Fikri', 'email' => 'fikri@a.ma', 'phone' => '+212611000001', 'role' => 'manager', 'status' => 'active']);
    $this->manager->assignRole('manager');
});

it('recherche un utilisateur cross-tenant (nom/email/tenant)', function () {
    $res = $this->withHeaders($this->auth)->getJson('/api/admin/users?q=Fikri')->assertStatus(200);
    $res->assertJsonPath('data.0.name', 'Mohammed Fikri')
        ->assertJsonPath('data.0.tenant.name', 'Gest Syndic A')
        ->assertJsonPath('data.0.status', 'active');

    // Recherche par nom de cabinet.
    $this->withHeaders($this->auth)->getJson('/api/admin/users?q=Gest Syndic')
        ->assertStatus(200)->assertJsonPath('data.0.email', 'fikri@a.ma');
});

it('réinitialise le mot de passe (temp password renvoyé + audit)', function () {
    $res = $this->withHeaders($this->auth)->postJson("/api/admin/users/{$this->manager->id}/reset-password")
        ->assertStatus(200);

    expect($res->json('data.temp_password'))->toBeString()->not->toBeEmpty();
    expect($this->manager->fresh()->must_change_password)->toBeTrue();
    expect(AuditLog::where('action', 'user_password_reset')->where('target_id', $this->manager->id)->exists())->toBeTrue();
});

it('active/désactive un compte et révoque ses tokens à la désactivation', function () {
    $this->manager->createToken('session');
    expect($this->manager->tokens()->count())->toBe(1);

    $this->withHeaders($this->auth)->postJson("/api/admin/users/{$this->manager->id}/toggle", ['is_active' => false])
        ->assertStatus(200)->assertJsonPath('data.status', 'inactive');

    expect($this->manager->fresh()->status)->toBe('inactive')
        ->and($this->manager->tokens()->count())->toBe(0);

    $this->withHeaders($this->auth)->postJson("/api/admin/users/{$this->manager->id}/toggle", ['is_active' => true])
        ->assertStatus(200)->assertJsonPath('data.status', 'active');
});

it('force la déconnexion (révoque les tokens)', function () {
    $this->manager->createToken('s1');
    $this->manager->createToken('s2');

    $this->withHeaders($this->auth)->postJson("/api/admin/users/{$this->manager->id}/logout")
        ->assertStatus(200);

    expect($this->manager->tokens()->count())->toBe(0);
    expect(AuditLog::where('action', 'user_force_logout')->exists())->toBeTrue();
});

it('refuse un non super_admin (403)', function () {
    $mgrAuth = ['Authorization' => 'Bearer '.$this->manager->createToken('t')->plainTextToken];
    $this->withHeaders($mgrAuth)->getJson('/api/admin/users')->assertStatus(403);
});
