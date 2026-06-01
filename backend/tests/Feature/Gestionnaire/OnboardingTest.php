<?php

use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Spatie\Permission\Models\Role;

uses(RefreshDatabase::class);

beforeEach(function () {
    foreach (['manager', 'gestionnaire'] as $role) {
        Role::firstOrCreate(['name' => $role, 'guard_name' => 'web']);
    }

    $this->tenant = Tenant::create([
        'name'      => 'Test Syndic',
        'email'     => 'test@syndic.ma',
        'subdomain' => 'test',
        'plan'      => 'business',
        'status'    => 'active',
    ]);
    config(['app.tenant_id' => $this->tenant->id]);

    $this->manager = User::create([
        'tenant_id' => $this->tenant->id,
        'name'      => 'Fikri',
        'email'     => 'fikri@test.ma',
        'password'  => Hash::make('x'),
        'role'      => 'manager',
        'status'    => 'active',
    ]);
    $this->manager->assignRole('manager');

    $this->gestionnaire = User::create([
        'tenant_id' => $this->tenant->id,
        'name'      => 'Salma',
        'email'     => 'salma@test.ma',
        'password'  => Hash::make('x'),
        'role'      => 'gestionnaire',
        'status'    => 'active',
    ]);
    $this->gestionnaire->assignRole('gestionnaire');
});

it('a new tenant has null onboarding state', function () {
    expect($this->tenant->onboarding_completed_at)->toBeNull();
    expect($this->tenant->onboarding_step)->toBeNull();
});

it('manager can save the current onboarding step', function () {
    $response = $this->actingAs($this->manager)
        ->patchJson('/api/gestionnaire/onboarding', ['step' => 2]);

    $response->assertStatus(200);
    $response->assertJsonPath('data.completed', false);
    $response->assertJsonPath('data.step', 2);

    expect($this->tenant->fresh()->onboarding_step)->toBe(2);
    expect($this->tenant->fresh()->onboarding_completed_at)->toBeNull();
});

it('manager can complete onboarding', function () {
    $response = $this->actingAs($this->manager)
        ->postJson('/api/gestionnaire/onboarding/complete');

    $response->assertStatus(200);
    $response->assertJsonPath('data.completed', true);
    $response->assertJsonPath('data.step', null);

    $fresh = $this->tenant->fresh();
    expect($fresh->onboarding_completed_at)->not->toBeNull();
    expect($fresh->onboarding_step)->toBeNull();
});

it('gestionnaire-employee gets 403 on onboarding endpoints', function () {
    $this->actingAs($this->gestionnaire)
        ->patchJson('/api/gestionnaire/onboarding', ['step' => 1])
        ->assertStatus(403);

    $this->actingAs($this->gestionnaire)
        ->postJson('/api/gestionnaire/onboarding/complete')
        ->assertStatus(403);
});

it('step validation rejects negative or out-of-range values', function () {
    $this->actingAs($this->manager)
        ->patchJson('/api/gestionnaire/onboarding', ['step' => -1])
        ->assertStatus(422);

    $this->actingAs($this->manager)
        ->patchJson('/api/gestionnaire/onboarding', ['step' => 99])
        ->assertStatus(422);

    $this->actingAs($this->manager)
        ->patchJson('/api/gestionnaire/onboarding', [])
        ->assertStatus(422);
});

it('/auth/me exposes onboarding fields in tenant payload', function () {
    $this->tenant->update(['onboarding_step' => 3]);

    $response = $this->actingAs($this->manager)->getJson('/api/auth/me');

    $response->assertStatus(200);
    $response->assertJsonPath('data.tenant.onboarding_step', 3);
    $response->assertJsonPath('data.tenant.onboarding_completed_at', null);
});

it('/auth/me reflects completed onboarding', function () {
    $this->tenant->update(['onboarding_completed_at' => now()]);

    $response = $this->actingAs($this->manager)->getJson('/api/auth/me');

    $response->assertStatus(200);
    expect($response->json('data.tenant.onboarding_completed_at'))->not->toBeNull();
});
