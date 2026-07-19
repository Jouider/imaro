<?php

use App\Models\AuditLog;
use App\Models\ImpersonationSession;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\PersonalAccessToken;
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

    $this->client = Tenant::create(['name' => 'Gest Syndic A', 'email' => 'a@a.ma', 'subdomain' => 'a', 'plan' => 'business', 'status' => 'active']);
    $this->manager = User::create(['tenant_id' => $this->client->id, 'name' => 'Fikri', 'phone' => '+212611000001', 'role' => 'manager', 'status' => 'active']);
    $this->manager->assignRole('manager');
});

it('trace une session lors d\'un dépannage (impersonation)', function () {
    $this->withHeaders($this->auth)->postJson("/api/admin/tenants/{$this->client->id}/impersonate")
        ->assertStatus(200);

    $session = ImpersonationSession::first();
    expect($session)->not->toBeNull()
        ->and($session->admin_id)->toBe($this->admin->id)
        ->and($session->tenant_id)->toBe($this->client->id)
        ->and($session->impersonated_user_id)->toBe($this->manager->id)
        ->and($session->token_id)->not->toBeNull()
        ->and($session->isActive())->toBeTrue();
});

it('liste l\'historique avec admin, cabinet, compte emprunté et durée', function () {
    $this->withHeaders($this->auth)->postJson("/api/admin/tenants/{$this->client->id}/impersonate")->assertStatus(200);

    $this->withHeaders($this->auth)->getJson('/api/admin/impersonations')
        ->assertStatus(200)
        ->assertJsonPath('data.0.admin.email', 'admin@imaro.ma')
        ->assertJsonPath('data.0.tenant.name', 'Gest Syndic A')
        ->assertJsonPath('data.0.impersonated_user.name', 'Fikri')
        ->assertJsonPath('data.0.is_active', true)
        ->assertJsonPath('data.0.ended_at', null);
});

it('termine une session : révoque le token, marque la fin et trace l\'audit', function () {
    $this->withHeaders($this->auth)->postJson("/api/admin/tenants/{$this->client->id}/impersonate")->assertStatus(200);
    $session = ImpersonationSession::first();

    expect(PersonalAccessToken::find($session->token_id))->not->toBeNull();

    $this->withHeaders($this->auth)->postJson("/api/admin/impersonations/{$session->id}/terminate")
        ->assertStatus(200)
        ->assertJsonPath('data.is_active', false);

    // Token révoqué → l'accès emprunté est coupé immédiatement.
    expect(PersonalAccessToken::find($session->token_id))->toBeNull();
    expect($session->fresh()->ended_at)->not->toBeNull()
        ->and($session->fresh()->ended_by)->toBe($this->admin->id);

    expect(AuditLog::where('action', 'impersonation_end')->exists())->toBeTrue();
});

it('refuse de terminer une session déjà terminée (422)', function () {
    $this->withHeaders($this->auth)->postJson("/api/admin/tenants/{$this->client->id}/impersonate")->assertStatus(200);
    $session = ImpersonationSession::first();

    $this->withHeaders($this->auth)->postJson("/api/admin/impersonations/{$session->id}/terminate")->assertStatus(200);
    $this->withHeaders($this->auth)->postJson("/api/admin/impersonations/{$session->id}/terminate")->assertStatus(422);
});

it('refuse un non super_admin (403)', function () {
    $mgrAuth = ['Authorization' => 'Bearer '.$this->manager->createToken('t')->plainTextToken];
    $this->withHeaders($mgrAuth)->getJson('/api/admin/impersonations')->assertStatus(403);
});
