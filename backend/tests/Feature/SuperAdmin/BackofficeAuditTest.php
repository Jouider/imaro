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

    $this->tenantA = Tenant::create(['name' => 'Cabinet A', 'email' => 'a@a.ma', 'subdomain' => 'a', 'plan' => 'business', 'status' => 'active']);
    $this->tenantB = Tenant::create(['name' => 'Cabinet B', 'email' => 'b@b.ma', 'subdomain' => 'b', 'plan' => 'starter', 'status' => 'active']);

    AuditLog::create(['tenant_id' => $this->tenantA->id, 'user_email' => 'admin@digitoyou.ma', 'category' => 'auth', 'action' => 'impersonation_start', 'severity' => 'sensitive', 'target_label' => 'Cabinet A', 'ip_address' => '105.66.1.1', 'created_at' => now()->subDays(1)]);
    AuditLog::create(['tenant_id' => $this->tenantB->id, 'user_email' => 'x@x.ma', 'category' => 'auth', 'action' => 'failed_login', 'severity' => 'warning', 'ip_address' => '197.0.0.9', 'created_at' => now()->subDays(2)]);
    AuditLog::create(['tenant_id' => $this->tenantA->id, 'user_email' => 'admin@digitoyou.ma', 'category' => 'paiement', 'action' => 'payment_created', 'severity' => 'info', 'created_at' => now()->subDays(3)]);
});

it('liste le journal cross-tenant (avec nom du cabinet), trié récent', function () {
    $res = $this->withHeaders($this->auth)->getJson('/api/admin/audit')->assertStatus(200);
    expect($res->json('data'))->toHaveCount(3);
    $res->assertJsonPath('data.0.action', 'impersonation_start')      // le plus récent
        ->assertJsonPath('data.0.tenant.name', 'Cabinet A');
});

it('filtre par sévérité, catégorie et tenant', function () {
    $this->withHeaders($this->auth)->getJson('/api/admin/audit?severity=sensitive')
        ->assertStatus(200)->assertJsonCount(1, 'data')->assertJsonPath('data.0.action', 'impersonation_start');

    $this->withHeaders($this->auth)->getJson('/api/admin/audit?category=auth')
        ->assertStatus(200)->assertJsonCount(2, 'data');

    $this->withHeaders($this->auth)->getJson("/api/admin/audit?tenant_id={$this->tenantB->id}")
        ->assertStatus(200)->assertJsonCount(1, 'data')->assertJsonPath('data.0.action', 'failed_login');
});

it('recherche plein-texte (action / cible / email)', function () {
    $this->withHeaders($this->auth)->getJson('/api/admin/audit?search=impersonation')
        ->assertStatus(200)->assertJsonCount(1, 'data');
});

it('exporte le journal en CSV', function () {
    $res = $this->withHeaders($this->auth)->get('/api/admin/audit/export')->assertStatus(200);
    expect($res->headers->get('content-type'))->toContain('text/csv');
    $body = $res->streamedContent();
    expect($body)->toContain('impersonation_start')->toContain('Cabinet A');
});

it('refuse un non super_admin (403)', function () {
    $mgr = User::create(['tenant_id' => $this->tenantA->id, 'name' => 'M', 'phone' => '+212611000099', 'role' => 'manager', 'status' => 'active']);
    $mgr->assignRole('manager');
    $this->withHeaders(['Authorization' => 'Bearer '.$mgr->createToken('t')->plainTextToken])
        ->getJson('/api/admin/audit')->assertStatus(403);
});
