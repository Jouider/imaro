<?php

use App\Models\DeviceToken;
use App\Models\Tenant;
use App\Models\User;
use App\Services\NativePushService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Spatie\Permission\Models\Role;

uses(RefreshDatabase::class);

beforeEach(function () {
    Role::firstOrCreate(['name' => 'resident', 'guard_name' => 'web']);
    $this->tenant = Tenant::create(['name' => 'T', 'email' => 't@t.ma', 'subdomain' => 't', 'plan' => 'starter', 'status' => 'active']);
    config(['app.tenant_id' => $this->tenant->id]);
    $this->resident = User::create(['tenant_id' => $this->tenant->id, 'name' => 'Hassan', 'phone' => '+212611111111', 'role' => 'resident', 'status' => 'active', 'password' => bcrypt('x')]);
    $this->resident->assignRole('resident');
    $this->auth = ['Authorization' => 'Bearer '.$this->resident->createToken('t')->plainTextToken];
});

it('enregistre un device token (upsert idempotent)', function () {
    $payload = ['token' => 'fcm-token-abc', 'platform' => 'android', 'app_version' => '1.0.0'];

    $this->withHeaders($this->auth)->postJson('/api/portail/push/register-device', $payload)->assertStatus(200);
    $this->withHeaders($this->auth)->postJson('/api/portail/push/register-device', $payload)->assertStatus(200);

    expect(DeviceToken::where('user_id', $this->resident->id)->count())->toBe(1);
    $dt = DeviceToken::first();
    expect($dt->platform)->toBe('android')
        ->and($dt->token_hash)->toBe(hash('sha256', 'fcm-token-abc'));
});

it('refuse une plateforme invalide (422)', function () {
    $this->withHeaders($this->auth)->postJson('/api/portail/push/register-device', [
        'token' => 'x', 'platform' => 'windows',
    ])->assertStatus(422);
});

it('désenregistre le device token (logout)', function () {
    DeviceToken::create([
        'user_id' => $this->resident->id, 'tenant_id' => $this->tenant->id,
        'token' => 'fcm-token-abc', 'token_hash' => hash('sha256', 'fcm-token-abc'), 'platform' => 'android',
    ]);

    $this->withHeaders($this->auth)->deleteJson('/api/portail/push/register-device', ['token' => 'fcm-token-abc'])
        ->assertStatus(200);

    expect(DeviceToken::count())->toBe(0);
});

it('le service no-op proprement quand aucun provider n\'est configuré', function () {
    Http::fake();
    config(['services.fcm.project_id' => null, 'services.apns.key_id' => null]);

    DeviceToken::create([
        'user_id' => $this->resident->id, 'tenant_id' => $this->tenant->id,
        'token' => 'fcm-token-abc', 'token_hash' => hash('sha256', 'fcm-token-abc'), 'platform' => 'android',
    ]);

    app(NativePushService::class)->sendToUser($this->resident, 'Titre', 'Corps', ['route' => '/portail/finances']);

    Http::assertNothingSent(); // aucun appel FCM/APNs tant que non configuré
});
