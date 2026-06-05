<?php

use App\Models\Tenant;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Spatie\Permission\Models\Role;

uses(RefreshDatabase::class);

beforeEach(function () {
    foreach (['manager', 'gestionnaire', 'conseil', 'resident', 'super_admin'] as $role) {
        Role::findOrCreate($role, 'web');
    }

    $this->tenant = Tenant::create([
        'name'      => 'Tenant Test',
        'subdomain' => 'tenant-test',
        'email'     => 'tenant@test.ma',
        'plan'      => 'business',
    ]);
});

/**
 * Auto-refresh exists so a mobile resident hitting /me with a soon-to-expire
 * token gets a fresh 30j one without having to re-login. The old token must
 * be revoked so a stolen-and-cached token can't keep working.
 */
it('refreshes the token on /me when it expires within 7 days', function () {
    $user = User::create([
        'tenant_id' => $this->tenant->id,
        'name'      => 'Mobile Resident',
        'email'     => 'r@example.com',
        'phone'     => '+212600000000',
        'password'  => bcrypt('x'),
        'role'      => 'resident',
        'status'    => 'active',
    ]);

    // Create a token that expires in 2 days — well below the 7-day threshold.
    $tokenString = $user->createToken(
        name:      'mobile',
        expiresAt: Carbon::now()->addDays(2),
    )->plainTextToken;

    $oldTokenId = explode('|', $tokenString)[0];

    $res = $this->withHeader('Authorization', 'Bearer '.$tokenString)
        ->getJson('/api/auth/me');

    $res->assertOk()
        ->assertJsonPath('data.refreshed', true)
        ->assertJsonStructure(['data' => ['token', 'token_type', 'expires_in']]);

    // The old token must be revoked.
    expect($user->tokens()->where('id', $oldTokenId)->exists())->toBeFalse();
});

it('does NOT refresh when the token has more than 7 days remaining', function () {
    $user = User::create([
        'tenant_id' => $this->tenant->id,
        'name'      => 'Fresh User',
        'email'     => 'f@example.com',
        'phone'     => '+212600000001',
        'password'  => bcrypt('x'),
        'role'      => 'manager',
        'status'    => 'active',
    ]);

    $tokenString = $user->createToken(
        name:      'web',
        expiresAt: Carbon::now()->addDays(25),
    )->plainTextToken;

    $res = $this->withHeader('Authorization', 'Bearer '.$tokenString)
        ->getJson('/api/auth/me');

    $res->assertOk()
        ->assertJsonMissingPath('data.token')
        ->assertJsonMissingPath('data.refreshed');
});
