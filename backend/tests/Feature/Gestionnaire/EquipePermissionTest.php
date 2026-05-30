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

it('UserResource returns permissions and residence_ids in /api/auth/me', function () {
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
    $response->assertJsonPath('data.user.permissions', ['residences', 'finances']);
    $response->assertJsonPath('data.user.residence_ids', [$this->residence1->id, $this->residence2->id]);
    $response->assertJsonPath('data.user.app_role', 'assistant');
});
