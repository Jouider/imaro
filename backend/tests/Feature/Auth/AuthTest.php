<?php

use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Role;

uses(RefreshDatabase::class);

beforeEach(function () {
    // Créer les rôles Spatie pour chaque test (RefreshDatabase remet à zéro)
    foreach (['super_admin', 'manager', 'gestionnaire', 'agent_recouvrement', 'conseil', 'resident'] as $role) {
        Role::firstOrCreate(['name' => $role, 'guard_name' => 'web']);
    }

    $this->tenant = Tenant::create([
        'name' => 'Test Syndic',
        'email' => 'test@syndic.ma',
        'subdomain' => 'test',
        'plan' => 'starter',
        'status' => 'active',
    ]);
    config(['app.tenant_id' => $this->tenant->id]);
});

// NB : le flow OTP (request-otp / verify-otp) n'a jamais été implémenté — l'auth
// admin est email + password (cf. CLAUDE.md). Les tests OTP correspondants ont été
// retirés (endpoints inexistants, 404).

it('returns user info on /auth/me', function () {
    $user = User::create([
        'tenant_id' => $this->tenant->id,
        'name' => 'Mohammed Fikri',
        'phone' => '+212644444444',
        'role' => 'manager',
        'status' => 'active',
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
        'name' => 'Test Logout',
        'phone' => '+212655555555',
        'role' => 'resident',
        'status' => 'active',
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
