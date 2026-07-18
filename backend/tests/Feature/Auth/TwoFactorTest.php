<?php

use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use PragmaRX\Google2FA\Google2FA;
use Spatie\Permission\Models\Role;

uses(RefreshDatabase::class);

beforeEach(function () {
    foreach (['super_admin', 'manager'] as $r) {
        Role::firstOrCreate(['name' => $r, 'guard_name' => 'web']);
    }
    // Un super_admin Digitoyou n'est rattaché à AUCUN cabinet (tenant_id null) —
    // reflète la réalité et couvre l'audit hors-tenant.
    $this->admin = User::create([
        'tenant_id' => null, 'name' => 'Admin', 'email' => 'admin@digitoyou.ma',
        'phone' => '+212600000000', 'role' => 'super_admin', 'status' => 'active',
        'password' => Hash::make('password123'),
    ]);
    $this->admin->assignRole('super_admin');
});

/**
 * Requête back-office avec un token donné. Réinitialise le guard Sanctum entre
 * deux appels : en test, l'instance d'app est partagée et le guard met en cache
 * l'utilisateur/token résolus (pas un souci en prod, chaque requête est isolée).
 */
function bo(?string $token = null)
{
    app('auth')->forgetGuards();

    return $token ? test()->withToken($token) : test();
}

/** Enrôle la 2FA et renvoie [secret, tokenComplet]. */
function enrol2fa(): array
{
    $enroll = bo()->postJson('/api/auth/login', ['email' => 'admin@digitoyou.ma', 'password' => 'password123'])
        ->assertStatus(200)->assertJsonPath('status', '2fa_setup_required')->json('data.enroll_token');

    $setup = bo($enroll)->postJson('/api/auth/2fa/setup')->assertStatus(200);
    $secret = $setup->json('data.secret');
    expect($setup->json('data.otpauth_url'))->toContain('otpauth://');

    $confirm = bo($enroll)->postJson('/api/auth/2fa/confirm', ['code' => (new Google2FA)->getCurrentOtp($secret)])->assertStatus(200);
    expect($confirm->json('data.recovery_codes'))->toHaveCount(8);

    return [$secret, $confirm->json('data.token')];
}

it('un super_admin sans 2FA est forcé à s\'enrôler et son token n\'accède pas au back-office', function () {
    $enroll = bo()->postJson('/api/auth/login', ['email' => 'admin@digitoyou.ma', 'password' => 'password123'])
        ->assertStatus(200)->assertJsonPath('status', '2fa_setup_required')->json('data.enroll_token');

    bo($enroll)->getJson('/api/admin/metrics')
        ->assertStatus(403)->assertJsonPath('code', 'two_factor_required');
});

it('enrôlement complet → token complet qui accède au back-office', function () {
    [, $token] = enrol2fa();

    expect($this->admin->fresh()->hasTwoFactorEnabled())->toBeTrue();
    bo($token)->getJson('/api/admin/metrics')->assertStatus(200);
});

it('une fois la 2FA active, le login exige un challenge', function () {
    enrol2fa();

    $challenge = bo()->postJson('/api/auth/login', ['email' => 'admin@digitoyou.ma', 'password' => 'password123'])
        ->assertStatus(200)->assertJsonPath('status', '2fa_required')->json('data.challenge_token');

    // Le token de challenge ne donne pas accès au back-office.
    bo($challenge)->getJson('/api/admin/metrics')->assertStatus(403);

    // Mauvais code → 401.
    bo($challenge)->postJson('/api/auth/2fa/verify', ['code' => '000000'])->assertStatus(401);

    // Bon code → token complet qui accède au back-office.
    $secret = $this->admin->fresh()->two_factor_secret;
    $token = bo($challenge)->postJson('/api/auth/2fa/verify', ['code' => (new Google2FA)->getCurrentOtp($secret)])
        ->assertStatus(200)->json('data.token');
    bo($token)->getJson('/api/admin/metrics')->assertStatus(200);
});

it('un code de secours permet de se connecter (usage unique)', function () {
    $enroll = bo()->postJson('/api/auth/login', ['email' => 'admin@digitoyou.ma', 'password' => 'password123'])->json('data.enroll_token');
    $secret = bo($enroll)->postJson('/api/auth/2fa/setup')->json('data.secret');
    $recovery = bo($enroll)->postJson('/api/auth/2fa/confirm', ['code' => (new Google2FA)->getCurrentOtp($secret)])->json('data.recovery_codes');
    $code = $recovery[0];

    $challenge = bo()->postJson('/api/auth/login', ['email' => 'admin@digitoyou.ma', 'password' => 'password123'])->json('data.challenge_token');
    bo($challenge)->postJson('/api/auth/2fa/verify', ['code' => $code])->assertStatus(200);

    // Réutilisation du même code de secours → refusé.
    $challenge2 = bo()->postJson('/api/auth/login', ['email' => 'admin@digitoyou.ma', 'password' => 'password123'])->json('data.challenge_token');
    bo($challenge2)->postJson('/api/auth/2fa/verify', ['code' => $code])->assertStatus(401);
});

it('un non super_admin se connecte normalement, sans 2FA', function () {
    $tenant = Tenant::create(['name' => 'A', 'email' => 'a@a.ma', 'subdomain' => 'a', 'plan' => 'business', 'status' => 'active']);
    $mgr = User::create(['tenant_id' => $tenant->id, 'name' => 'Mgr', 'email' => 'mgr@a.ma', 'phone' => '+212611000001', 'role' => 'manager', 'status' => 'active', 'password' => Hash::make('password123')]);
    $mgr->assignRole('manager');

    bo()->postJson('/api/auth/login', ['email' => 'mgr@a.ma', 'password' => 'password123'])
        ->assertStatus(200)->assertJsonPath('status', 'success')
        ->assertJsonPath('data.token_type', 'Bearer');
});
