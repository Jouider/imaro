<?php

use App\Models\AuditLog;
use App\Models\FeatureFlag;
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
});

it('liste le registre de flags seedé', function () {
    $res = $this->withHeaders($this->auth)->getJson('/api/admin/feature-flags')->assertStatus(200);

    $keys = collect($res->json('data'))->pluck('key')->all();
    expect($keys)->toContain('ai', 'mobile', 'budgets_avances', 'ocr_factures', 'exports_comptables');

    // L'IA est désactivée pour tous les plans par défaut (coût — KAN-111).
    $ai = collect($res->json('data'))->firstWhere('key', 'ai');
    expect($ai['enabled_plans'])->toBe([]);
});

it('bascule les plans d\'un flag (et trace l\'audit)', function () {
    $this->withHeaders($this->auth)->putJson('/api/admin/feature-flags/ocr_factures', [
        'enabled_plans' => ['business', 'large'],
    ])->assertStatus(200)->assertJsonPath('data.enabled_plans', ['business', 'large']);

    expect(FeatureFlag::where('key', 'ocr_factures')->first()->enabled_plans)->toBe(['business', 'large']);
    expect(AuditLog::where('action', 'feature_flag_updated')->where('target_label', 'ocr_factures')->exists())->toBeTrue();
});

it('refuse un plan inconnu (422)', function () {
    $this->withHeaders($this->auth)->putJson('/api/admin/feature-flags/mobile', [
        'enabled_plans' => ['premium'],   // n'existe pas dans config/plans.php
    ])->assertStatus(422)->assertJsonValidationErrors(['enabled_plans.0']);
});

it('expose les droits résolus du cabinet dans /auth/me', function () {
    $tenant = Tenant::create(['name' => 'Cabinet Business', 'email' => 'b@b.ma', 'subdomain' => 'b', 'plan' => 'business', 'status' => 'active']);
    $mgr = User::create(['tenant_id' => $tenant->id, 'name' => 'Mgr', 'phone' => '+212611000001', 'role' => 'manager', 'status' => 'active']);
    $mgr->assignRole('manager');

    $res = $this->withHeaders(['Authorization' => 'Bearer '.$mgr->createToken('t')->plainTextToken])
        ->getJson('/api/auth/me')->assertStatus(200);

    $features = $res->json('data.features');
    // Plan business → mobile + budgets avancés + exports ; pas d'OCR, pas d'IA.
    expect($features)->toContain('mobile', 'budgets_avances', 'exports_comptables')
        ->not->toContain('ocr_factures')
        ->not->toContain('ai');
});

it('le kill-switch global IA prime sur le flag par plan', function () {
    // On active l'IA pour business dans le registre…
    FeatureFlag::where('key', 'ai')->update(['enabled_plans' => json_encode(['business'])]);

    $tenant = Tenant::create(['name' => 'C', 'email' => 'c@c.ma', 'subdomain' => 'c', 'plan' => 'business', 'status' => 'active']);
    $mgr = User::create(['tenant_id' => $tenant->id, 'name' => 'M', 'phone' => '+212611000002', 'role' => 'manager', 'status' => 'active']);
    $mgr->assignRole('manager');
    $auth = ['Authorization' => 'Bearer '.$mgr->createToken('t')->plainTextToken];

    // …mais le kill-switch global est OFF → l'IA reste indisponible.
    config(['features.ia' => false]);
    expect($this->withHeaders($auth)->getJson('/api/auth/me')->json('data.features'))->not->toContain('ai');

    // Kill-switch ON → l'IA suit le plan.
    config(['features.ia' => true]);
    expect($this->withHeaders($auth)->getJson('/api/auth/me')->json('data.features'))->toContain('ai');
});

it('refuse un non super_admin (403)', function () {
    $t = Tenant::create(['name' => 'X', 'email' => 'x@x.ma', 'subdomain' => 'x', 'plan' => 'starter', 'status' => 'active']);
    $mgr = User::create(['tenant_id' => $t->id, 'name' => 'M', 'phone' => '+212611000009', 'role' => 'manager', 'status' => 'active']);
    $mgr->assignRole('manager');

    $this->withHeaders(['Authorization' => 'Bearer '.$mgr->createToken('t')->plainTextToken])
        ->getJson('/api/admin/feature-flags')->assertStatus(403);
});
