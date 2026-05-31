<?php

use App\Models\Residence;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Spatie\Permission\Models\Role;

uses(RefreshDatabase::class);

beforeEach(function () {
    foreach (['super_admin', 'manager', 'gestionnaire'] as $role) {
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

    // Manager — bypasses all permission checks
    $this->manager = User::create([
        'tenant_id' => $this->tenant->id,
        'name'      => 'Fikri Manager',
        'phone'     => '+212600000099',
        'email'     => 'manager@test.ma',
        'password'  => Hash::make('test1234'),
        'role'      => 'manager',
        'status'    => 'active',
    ]);
    $this->manager->assignRole('manager');

    // Residences
    $this->residence1 = Residence::create([
        'tenant_id' => $this->tenant->id,
        'name'      => 'Résidence Atlas',
        'address'   => 'Bd Mohammed V',
        'city'      => 'Casablanca',
    ]);
    $this->residence2 = Residence::create([
        'tenant_id' => $this->tenant->id,
        'name'      => 'Résidence Anfa',
        'address'   => 'Anfa Place',
        'city'      => 'Casablanca',
    ]);
});

it('manager can create an equipe gestionnaire with limited permissions', function () {
    $response = $this->actingAs($this->manager)->postJson('/api/equipe/utilisateurs', [
        'name'          => 'Salma Limited',
        'email'         => 'salma@test.ma',
        'password'      => 'secret123',
        'role'          => 'assistant',
        'permissions'   => ['residences'],
        'residence_ids' => [$this->residence1->id],
    ]);

    $response->assertStatus(201);

    $created = User::where('email', 'salma@test.ma')->first();
    expect($created->app_permissions)->toBe(['residences']);
    expect($created->equipe_residence_ids)->toBe([$this->residence1->id]);
    expect($created->hasRole('gestionnaire'))->toBeTrue();
});

it('restricted gestionnaire gets 403 on /api/equipe/utilisateurs without personnel permission', function () {
    $gestionnaire = User::create([
        'tenant_id'            => $this->tenant->id,
        'name'                 => 'Salma',
        'email'                => 'salma@test.ma',
        'password'             => Hash::make('x'),
        'role'                 => 'gestionnaire',
        'app_role'             => 'assistant',
        'app_permissions'      => ['residences'],   // no 'personnel'
        'equipe_residence_ids' => [$this->residence1->id],
        'status'               => 'active',
    ]);
    $gestionnaire->assignRole('gestionnaire');

    // Alias route (the one the frontend actually calls)
    $response = $this->actingAs($gestionnaire)->postJson('/api/equipe/utilisateurs', [
        'name'     => 'Nouveau',
        'email'    => 'nouveau@test.ma',
        'password' => 'x12345678',
        'role'     => 'assistant',
    ]);

    $response->assertStatus(403);
});

it('restricted gestionnaire gets 403 on /api/gestionnaire/coproprietaires without coproprietaires permission', function () {
    $gestionnaire = User::create([
        'tenant_id'            => $this->tenant->id,
        'name'                 => 'Salma',
        'email'                => 'salma@test.ma',
        'password'             => Hash::make('x'),
        'role'                 => 'gestionnaire',
        'app_role'             => 'assistant',
        'app_permissions'      => ['residences'],
        'equipe_residence_ids' => [$this->residence1->id],
        'status'               => 'active',
    ]);
    $gestionnaire->assignRole('gestionnaire');

    $response = $this->actingAs($gestionnaire)->getJson('/api/gestionnaire/coproprietaires');

    $response->assertStatus(403);
});

it('restricted gestionnaire gets 403 on paiements without finances permission', function () {
    $gestionnaire = User::create([
        'tenant_id'            => $this->tenant->id,
        'name'                 => 'Salma',
        'email'                => 'salma@test.ma',
        'password'             => Hash::make('x'),
        'role'                 => 'gestionnaire',
        'app_role'             => 'assistant',
        'app_permissions'      => ['residences'],
        'equipe_residence_ids' => [$this->residence1->id],
        'status'               => 'active',
    ]);
    $gestionnaire->assignRole('gestionnaire');

    $response = $this->actingAs($gestionnaire)->getJson('/api/gestionnaire/paiements');

    $response->assertStatus(403);
});

it('gestionnaire with personnel permission CAN access /api/equipe/utilisateurs', function () {
    $gestionnaire = User::create([
        'tenant_id'            => $this->tenant->id,
        'name'                 => 'Karim',
        'email'                => 'karim@test.ma',
        'password'             => Hash::make('x'),
        'role'                 => 'gestionnaire',
        'app_role'             => 'administrateur',
        'app_permissions'      => ['residences', 'personnel'],
        'equipe_residence_ids' => [$this->residence1->id],
        'status'               => 'active',
    ]);
    $gestionnaire->assignRole('gestionnaire');

    $response = $this->actingAs($gestionnaire)->getJson('/api/equipe/utilisateurs');

    $response->assertStatus(200);
});

it('manager bypasses all permission checks', function () {
    $response = $this->actingAs($this->manager)->getJson('/api/gestionnaire/coproprietaires');
    $response->assertStatus(200);

    $response = $this->actingAs($this->manager)->getJson('/api/gestionnaire/paiements');
    $response->assertStatus(200);

    $response = $this->actingAs($this->manager)->getJson('/api/equipe/utilisateurs');
    $response->assertStatus(200);
});

it('legacy gestionnaire without app_permissions is not restricted', function () {
    $gestionnaire = User::create([
        'tenant_id' => $this->tenant->id,
        'name'      => 'Old Gestionnaire',
        'email'     => 'old@test.ma',
        'password'  => Hash::make('x'),
        'phone'     => '+212600000077',
        'role'      => 'gestionnaire',
        // no app_permissions, no equipe_residence_ids
        'status'    => 'active',
    ]);
    $gestionnaire->assignRole('gestionnaire');

    $response = $this->actingAs($gestionnaire)->getJson('/api/gestionnaire/coproprietaires');
    $response->assertStatus(200);
});

it('residences scope uses equipe_residence_ids for equipe gestionnaire', function () {
    $gestionnaire = User::create([
        'tenant_id'            => $this->tenant->id,
        'name'                 => 'Salma',
        'email'                => 'salma@test.ma',
        'password'             => Hash::make('x'),
        'role'                 => 'gestionnaire',
        'app_role'             => 'assistant',
        'app_permissions'      => ['residences'],
        'equipe_residence_ids' => [$this->residence1->id],  // only residence1
        'status'               => 'active',
    ]);
    $gestionnaire->assignRole('gestionnaire');

    $response = $this->actingAs($gestionnaire)->getJson('/api/gestionnaire/residences');

    $response->assertStatus(200);
    $data = $response->json('data.residences');
    expect(count($data))->toBe(1);
    expect($data[0]['id'])->toBe($this->residence1->id);
});

it('manager can recreate a gestionnaire with same email after soft-delete', function () {
    // Create first
    $response = $this->actingAs($this->manager)->postJson('/api/equipe/utilisateurs', [
        'name'        => 'Salma',
        'email'       => 'salma@test.ma',
        'password'    => 'secret123',
        'role'        => 'assistant',
        'permissions' => ['residences'],
    ]);
    $response->assertStatus(201);
    $userId = $response->json('data.id');

    // Delete (soft-delete)
    $deleteResponse = $this->actingAs($this->manager)
        ->deleteJson("/api/equipe/utilisateurs/{$userId}");
    $deleteResponse->assertStatus(200);

    // Recreate with same email — must succeed
    $recreateResponse = $this->actingAs($this->manager)->postJson('/api/equipe/utilisateurs', [
        'name'        => 'Salma Nouvelle',
        'email'       => 'salma@test.ma',
        'password'    => 'newsecret123',
        'role'        => 'gestionnaire',
        'permissions' => ['residences', 'finances'],
    ]);
    $recreateResponse->assertStatus(201);
    expect($recreateResponse->json('data.name'))->toBe('Salma Nouvelle');
    expect($recreateResponse->json('data.id'))->not->toBe($userId);
});

it('newly created equipe user can login (soft-deleted predecessor does not interfere)', function () {
    // Create a first user, soft-delete it
    $first = $this->actingAs($this->manager)->postJson('/api/equipe/utilisateurs', [
        'name'        => 'Salma',
        'email'       => 'salma@test.ma',
        'password'    => 'oldpass123',
        'role'        => 'assistant',
        'permissions' => ['residences'],
    ])->assertStatus(201);

    $firstId = $first->json('data.id');
    $this->actingAs($this->manager)->deleteJson("/api/equipe/utilisateurs/{$firstId}")
        ->assertStatus(200);

    // Recreate with same email but new password
    $this->actingAs($this->manager)->postJson('/api/equipe/utilisateurs', [
        'name'        => 'Salma Nouvelle',
        'email'       => 'salma@test.ma',
        'password'    => 'newpass456',
        'role'        => 'assistant',
        'permissions' => ['residences'],
    ])->assertStatus(201);

    // Login with the NEW temp password — must return first_login flow (new behavior)
    $loginResponse = $this->postJson('/api/auth/login', [
        'email'    => 'salma@test.ma',
        'password' => 'newpass456',
    ]);

    $loginResponse->assertStatus(200);
    $loginResponse->assertJsonPath('status', 'first_login');
});

it('newly created equipe user has must_change_password = true', function () {
    $this->actingAs($this->manager)->postJson('/api/equipe/utilisateurs', [
        'name'        => 'Salma',
        'email'       => 'salma@test.ma',
        'password'    => 'temppass123',
        'role'        => 'assistant',
        'permissions' => ['residences'],
    ])->assertStatus(201);

    $user = User::where('email', 'salma@test.ma')->first();
    expect($user->must_change_password)->toBeTrue();
});

it('first login of equipe user returns status=first_login (no token)', function () {
    $this->actingAs($this->manager)->postJson('/api/equipe/utilisateurs', [
        'name'        => 'Salma',
        'email'       => 'salma@test.ma',
        'password'    => 'temppass123',
        'role'        => 'assistant',
        'permissions' => ['residences'],
    ])->assertStatus(201);

    $response = $this->postJson('/api/auth/login', [
        'email'    => 'salma@test.ma',
        'password' => 'temppass123',
    ]);

    $response->assertStatus(200);
    $response->assertJsonPath('status', 'first_login');
    $response->assertJsonPath('data.email', 'salma@test.ma');
    expect($response->json('data.token'))->toBeNull();
});

it('activate endpoint sets new password and returns token', function () {
    $this->actingAs($this->manager)->postJson('/api/equipe/utilisateurs', [
        'name'        => 'Salma',
        'email'       => 'salma@test.ma',
        'password'    => 'temppass123',
        'role'        => 'assistant',
        'permissions' => ['residences'],
    ])->assertStatus(201);

    $response = $this->postJson('/api/auth/activate', [
        'email'                      => 'salma@test.ma',
        'current_password'           => 'temppass123',
        'new_password'               => 'mynewsecret456',
        'new_password_confirmation'  => 'mynewsecret456',
    ]);

    $response->assertStatus(200);
    $response->assertJsonPath('status', 'success');
    expect($response->json('data.token'))->not->toBeNull();

    $user = User::where('email', 'salma@test.ma')->first();
    expect($user->must_change_password)->toBeFalse();
    expect(\Illuminate\Support\Facades\Hash::check('mynewsecret456', $user->password))->toBeTrue();
});

it('login with new password works after activation', function () {
    $this->actingAs($this->manager)->postJson('/api/equipe/utilisateurs', [
        'name'        => 'Salma',
        'email'       => 'salma@test.ma',
        'password'    => 'temppass123',
        'role'        => 'assistant',
        'permissions' => ['residences'],
    ])->assertStatus(201);

    $this->postJson('/api/auth/activate', [
        'email'                     => 'salma@test.ma',
        'current_password'          => 'temppass123',
        'new_password'              => 'mynewsecret456',
        'new_password_confirmation' => 'mynewsecret456',
    ])->assertStatus(200);

    // Now a normal login with the new password
    $response = $this->postJson('/api/auth/login', [
        'email'    => 'salma@test.ma',
        'password' => 'mynewsecret456',
    ]);

    $response->assertStatus(200);
    $response->assertJsonPath('status', 'success');
    expect($response->json('data.token'))->not->toBeNull();
});

it('activate rejects an already-activated account', function () {
    $this->actingAs($this->manager)->postJson('/api/equipe/utilisateurs', [
        'name'        => 'Salma',
        'email'       => 'salma@test.ma',
        'password'    => 'temppass123',
        'role'        => 'assistant',
        'permissions' => ['residences'],
    ])->assertStatus(201);

    $this->postJson('/api/auth/activate', [
        'email'                     => 'salma@test.ma',
        'current_password'          => 'temppass123',
        'new_password'              => 'mynewsecret456',
        'new_password_confirmation' => 'mynewsecret456',
    ])->assertStatus(200);

    // Try to activate again — should reject
    $response = $this->postJson('/api/auth/activate', [
        'email'                     => 'salma@test.ma',
        'current_password'          => 'mynewsecret456',
        'new_password'              => 'another789',
        'new_password_confirmation' => 'another789',
    ]);

    $response->assertStatus(422);
});

it('manager login (without must_change_password) returns token directly', function () {
    $response = $this->postJson('/api/auth/login', [
        'email'    => 'manager@test.ma',
        'password' => 'test1234',
    ]);

    $response->assertStatus(200);
    $response->assertJsonPath('status', 'success');
    expect($response->json('data.token'))->not->toBeNull();
});

it('UserResource returns app_permissions and residence_ids in /api/auth/me', function () {
    $gestionnaire = User::create([
        'tenant_id'            => $this->tenant->id,
        'name'                 => 'Salma',
        'email'                => 'salma@test.ma',
        'password'             => Hash::make('x'),
        'role'                 => 'gestionnaire',
        'app_role'             => 'assistant',
        'app_permissions'      => ['residences', 'finances'],
        'equipe_residence_ids' => [$this->residence1->id, $this->residence2->id],
        'status'               => 'active',
    ]);
    $gestionnaire->assignRole('gestionnaire');

    $response = $this->actingAs($gestionnaire)->getJson('/api/auth/me');

    $response->assertStatus(200);
    $response->assertJsonPath('data.user.app_permissions', ['residences', 'finances']);
    $response->assertJsonPath('data.user.residence_ids', [$this->residence1->id, $this->residence2->id]);
    $response->assertJsonPath('data.user.app_role', 'assistant');
});
