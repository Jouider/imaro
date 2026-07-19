<?php

use App\Models\Notification;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Spatie\Permission\Models\Role;

uses(RefreshDatabase::class);

beforeEach(function () {
    Mail::fake();
    foreach (['super_admin', 'manager', 'gestionnaire', 'resident'] as $r) {
        Role::firstOrCreate(['name' => $r, 'guard_name' => 'web']);
    }

    $ops = Tenant::create(['name' => 'Digitoyou', 'email' => 'ops@imaro.ma', 'subdomain' => 'ops', 'plan' => 'enterprise', 'status' => 'active']);
    $this->admin = User::create(['tenant_id' => $ops->id, 'name' => 'Admin', 'phone' => '+212600000000', 'role' => 'super_admin', 'status' => 'active']);
    $this->admin->assignRole('super_admin');
    $this->auth = ['Authorization' => 'Bearer '.$this->admin->createToken('t')->plainTextToken];

    // 2 cabinets : 1 business, 1 starter. Chacun un manager (+email) et un résident (exclu).
    $this->business = Tenant::create(['name' => 'Cabinet Business', 'email' => 'biz@a.ma', 'subdomain' => 'biz', 'plan' => 'business', 'status' => 'active']);
    $this->mgrBiz = User::create(['tenant_id' => $this->business->id, 'name' => 'Mgr Biz', 'email' => 'mgrbiz@a.ma', 'phone' => '+212611000001', 'role' => 'manager', 'status' => 'active']);
    User::create(['tenant_id' => $this->business->id, 'name' => 'Resident Biz', 'phone' => '+212611000002', 'role' => 'resident', 'status' => 'active']);

    $this->starter = Tenant::create(['name' => 'Cabinet Starter', 'email' => 'st@b.ma', 'subdomain' => 'st', 'plan' => 'starter', 'status' => 'active']);
    $this->mgrStarter = User::create(['tenant_id' => $this->starter->id, 'name' => 'Mgr Starter', 'email' => 'mgrst@b.ma', 'phone' => '+212611000003', 'role' => 'manager', 'status' => 'active']);
});

it('diffuse à tous les cabinets (bannière in-app aux managers, pas aux résidents)', function () {
    $res = $this->withHeaders($this->auth)->postJson('/api/admin/broadcasts', [
        'title' => 'Maintenance', 'message' => 'Dimanche 2h-4h', 'target' => 'all', 'channels' => ['app', 'email'],
    ])->assertStatus(201);

    // 2 managers destinataires (résident exclu, super_admin exclu).
    $res->assertJsonPath('data.recipients_count', 2)
        ->assertJsonPath('data.read_count', 0);
    expect($res->json('data.sent_at'))->not->toBeNull();

    // Bannières in-app créées pour les 2 managers uniquement.
    expect(Notification::where('title', 'Maintenance')->count())->toBe(2);
    expect(Notification::where('user_id', $this->mgrBiz->id)->exists())->toBeTrue();
});

it('cible un plan précis', function () {
    $this->withHeaders($this->auth)->postJson('/api/admin/broadcasts', [
        'title' => 'Nouveau module', 'message' => 'Budgets dispo', 'target' => 'plan', 'target_value' => 'business', 'channels' => ['app'],
    ])->assertStatus(201)->assertJsonPath('data.recipients_count', 1);

    expect(Notification::where('title', 'Nouveau module')->count())->toBe(1);
    expect(Notification::where('user_id', $this->mgrStarter->id)->exists())->toBeFalse();
});

it('cible un cabinet précis', function () {
    $this->withHeaders($this->auth)->postJson('/api/admin/broadcasts', [
        'title' => 'Message direct', 'message' => 'Coucou', 'target' => 'tenant', 'target_value' => (string) $this->starter->id, 'channels' => ['app'],
    ])->assertStatus(201)->assertJsonPath('data.recipients_count', 1);

    expect(Notification::where('user_id', $this->mgrStarter->id)->where('title', 'Message direct')->exists())->toBeTrue();
});

it('exige target_value pour un ciblage plan/tenant', function () {
    $this->withHeaders($this->auth)->postJson('/api/admin/broadcasts', [
        'title' => 'X', 'message' => 'Y', 'target' => 'plan', 'channels' => ['app'],
    ])->assertStatus(422)->assertJsonValidationErrors(['target_value']);
});

it('programme une diffusion future sans l\'envoyer', function () {
    $res = $this->withHeaders($this->auth)->postJson('/api/admin/broadcasts', [
        'title' => 'Programmé', 'message' => 'Plus tard', 'target' => 'all', 'channels' => ['app'],
        'scheduled_at' => now()->addDays(2)->toIso8601String(),
    ])->assertStatus(201);

    $res->assertJsonPath('data.recipients_count', 0);
    expect($res->json('data.sent_at'))->toBeNull();
    expect(Notification::where('title', 'Programmé')->count())->toBe(0);
});

it('liste l\'historique avec accusés de lecture', function () {
    $this->withHeaders($this->auth)->postJson('/api/admin/broadcasts', [
        'title' => 'Info', 'message' => 'Lue par un', 'target' => 'all', 'channels' => ['app'],
    ])->assertStatus(201);

    // Un manager lit la bannière.
    Notification::where('user_id', $this->mgrBiz->id)->update(['read' => true]);

    $this->withHeaders($this->auth)->getJson('/api/admin/broadcasts')
        ->assertStatus(200)
        ->assertJsonPath('data.0.title', 'Info')
        ->assertJsonPath('data.0.recipients_count', 2)
        ->assertJsonPath('data.0.read_count', 1);
});

it('refuse un non super_admin (403)', function () {
    $this->withHeaders(['Authorization' => 'Bearer '.$this->mgrBiz->createToken('t')->plainTextToken])
        ->getJson('/api/admin/broadcasts')->assertStatus(403);
});
