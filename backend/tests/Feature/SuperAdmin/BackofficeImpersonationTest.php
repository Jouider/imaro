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
    $this->admin = User::create(['tenant_id' => $ops->id, 'name' => 'Admin', 'email' => 'admin@imaro.ma', 'phone' => '+212600000000', 'role' => 'super_admin', 'status' => 'active']);
    $this->admin->assignRole('super_admin');
    $this->auth = ['Authorization' => 'Bearer '.$this->admin->createToken('t')->plainTextToken];

    $this->client = Tenant::create(['name' => 'Cabinet Atlas', 'email' => 'atlas@x.ma', 'subdomain' => 'atlas', 'plan' => 'business', 'status' => 'active']);
});

it('impersonate → token court + audit tracé (super_admin)', function () {
    $manager = User::create(['tenant_id' => $this->client->id, 'name' => 'Fikri', 'email' => 'fikri@x.ma', 'phone' => '+212611111111', 'role' => 'manager', 'status' => 'active']);
    $manager->assignRole('manager');

    $this->withHeaders($this->auth)->postJson("/api/admin/tenants/{$this->client->id}/impersonate")
        ->assertStatus(200)
        ->assertJsonPath('data.impersonated_user.id', $manager->id)
        ->assertJsonPath('data.tenant.id', $this->client->id)
        ->assertJsonStructure(['data' => ['token', 'expires_at']]);

    $log = AuditLog::where('action', 'impersonation_start')->first();
    expect($log)->not->toBeNull()
        ->and($log->tenant_id)->toBe($this->client->id)
        ->and($log->user_id)->toBe($this->admin->id)
        ->and($log->payload['impersonated_user_id'])->toBe($manager->id);
});

it('refuse si le cabinet n\'a aucun manager actif (422)', function () {
    $this->withHeaders($this->auth)->postJson("/api/admin/tenants/{$this->client->id}/impersonate")
        ->assertStatus(422);
});

it('expose le journal d\'activité récent du cabinet (brique 4)', function () {
    AuditLog::create([
        'tenant_id' => $this->client->id, 'user_id' => $this->admin->id, 'user_email' => 'x@x.ma',
        'category' => 'paiement', 'action' => 'paiement_valide', 'severity' => 'info',
        'target_label' => 'VIR-001', 'created_at' => now(),
    ]);

    $this->withHeaders($this->auth)->getJson("/api/admin/tenants/{$this->client->id}/activity")
        ->assertStatus(200)
        ->assertJsonCount(1, 'data.activity')
        ->assertJsonPath('data.activity.0.action', 'paiement_valide');
});

it('un non super_admin ne peut pas impersoner (403)', function () {
    $mgr = User::create(['tenant_id' => $this->client->id, 'name' => 'M', 'email' => 'm@x.ma', 'phone' => '+212622222222', 'role' => 'manager', 'status' => 'active']);
    $mgr->assignRole('manager');
    $mgrAuth = ['Authorization' => 'Bearer '.$mgr->createToken('t')->plainTextToken];

    $this->withHeaders($mgrAuth)->postJson("/api/admin/tenants/{$this->client->id}/impersonate")
        ->assertStatus(403);
});
