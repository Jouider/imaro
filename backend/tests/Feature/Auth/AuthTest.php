<?php

use App\Models\Tenant;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Role;

uses(RefreshDatabase::class);

beforeEach(function () {
    // Créer les rôles Spatie pour chaque test (RefreshDatabase remet à zéro)
    foreach (['super_admin', 'manager', 'gestionnaire', 'agent_recouvrement', 'conseil', 'resident'] as $role) {
        Role::firstOrCreate(['name' => $role, 'guard_name' => 'web']);
    }

    $this->tenant = Tenant::create([
        'name'      => 'Test Syndic',
        'email'     => 'test@syndic.ma',
        'subdomain' => 'test',
        'plan'      => 'starter',
        'status'    => 'active',
    ]);
    config(['app.tenant_id' => $this->tenant->id]);
});

it('refuses invalid phone format', function () {
    $this->postJson('/api/auth/request-otp', ['phone' => '0612345678'])
        ->assertStatus(422)
        ->assertJsonPath('status', 'error');
});

it('sends OTP to valid moroccan phone', function () {
    $this->postJson('/api/auth/request-otp', ['phone' => '+212612345678'])
        ->assertStatus(200)
        ->assertJsonPath('status', 'success')
        ->assertJsonStructure(['data' => ['expires_in', 'phone']]);

    $user = User::withoutGlobalScopes()->where('phone', '+212612345678')->first();
    expect($user)->not->toBeNull()
        ->and($user->otp_code)->not->toBeNull()
        ->and($user->otp_expires_at)->not->toBeNull();
});

it('rejects wrong OTP', function () {
    User::create([
        'tenant_id'      => $this->tenant->id,
        'name'           => 'Test User',
        'phone'          => '+212611111111',
        'role'           => 'resident',
        'status'         => 'active',
        'otp_code'       => hash('sha256', '123456'),
        'otp_expires_at' => Carbon::now()->addMinutes(5),
    ]);

    $this->postJson('/api/auth/verify-otp', [
        'phone' => '+212611111111',
        'otp'   => '999999',
    ])->assertStatus(401)
        ->assertJsonPath('status', 'error');
});

it('rejects expired OTP', function () {
    User::create([
        'tenant_id'      => $this->tenant->id,
        'name'           => 'Test User',
        'phone'          => '+212622222222',
        'role'           => 'resident',
        'status'         => 'active',
        'otp_code'       => hash('sha256', '123456'),
        'otp_expires_at' => Carbon::now()->subMinutes(1),
    ]);

    $this->postJson('/api/auth/verify-otp', [
        'phone' => '+212622222222',
        'otp'   => '123456',
    ])->assertStatus(401);
});

it('returns token on valid OTP', function () {
    $user = User::create([
        'tenant_id'      => $this->tenant->id,
        'name'           => 'Hassan Benali',
        'phone'          => '+212633333333',
        'role'           => 'gestionnaire',
        'status'         => 'active',
        'otp_code'       => hash('sha256', '654321'),
        'otp_expires_at' => Carbon::now()->addMinutes(5),
    ]);
    $user->assignRole('gestionnaire');

    $this->postJson('/api/auth/verify-otp', [
        'phone' => '+212633333333',
        'otp'   => '654321',
    ])->assertStatus(200)
        ->assertJsonPath('status', 'success')
        ->assertJsonStructure(['data' => ['token', 'token_type', 'expires_in', 'user']]);

    $user->refresh();
    expect($user->otp_code)->toBeNull()
        ->and($user->otp_expires_at)->toBeNull();
});

it('returns user info on /auth/me', function () {
    $user = User::create([
        'tenant_id' => $this->tenant->id,
        'name'      => 'Mohammed Fikri',
        'phone'     => '+212644444444',
        'role'      => 'manager',
        'status'    => 'active',
    ]);
    $user->assignRole('manager');

    $token = $user->createToken('test')->plainTextToken;

    $this->withHeaders(['Authorization' => "Bearer {$token}"])
        ->getJson('/api/auth/me')
        ->assertStatus(200)
        ->assertJsonPath('data.user.role', 'manager')
        ->assertJsonPath('data.user.name', 'Mohammed Fikri');
});

it('invalidates token on logout', function () {
    $user = User::create([
        'tenant_id' => $this->tenant->id,
        'name'      => 'Test Logout',
        'phone'     => '+212655555555',
        'role'      => 'resident',
        'status'    => 'active',
    ]);

    $token = $user->createToken('test')->plainTextToken;

    $this->withHeaders(['Authorization' => "Bearer {$token}"])
        ->postJson('/api/auth/logout')
        ->assertStatus(200);

    // Réinitialiser les guards pour forcer une nouvelle résolution du token
    auth()->forgetGuards();

    $this->withHeaders(['Authorization' => "Bearer {$token}"])
        ->getJson('/api/auth/me')
        ->assertStatus(401);
});
