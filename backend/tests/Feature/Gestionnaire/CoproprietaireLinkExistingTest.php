<?php

use App\Models\Coproprietaire;
use App\Models\Immeuble;
use App\Models\Lot;
use App\Models\Residence;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Role;

uses(RefreshDatabase::class);

beforeEach(function () {
    foreach (['super_admin', 'manager', 'gestionnaire', 'conseil', 'resident'] as $role) {
        Role::firstOrCreate(['name' => $role, 'guard_name' => 'web']);
    }

    $this->tenant = Tenant::create([
        'name' => 'Test Syndic', 'email' => 'test@syndic.ma',
        'subdomain' => 'test', 'plan' => 'starter', 'status' => 'active',
    ]);
    config(['app.tenant_id' => $this->tenant->id]);

    $this->gestionnaire = User::create([
        'tenant_id' => $this->tenant->id, 'name' => 'Karim Gest',
        'phone' => '+212611000001', 'role' => 'gestionnaire', 'status' => 'active',
    ]);
    $this->gestionnaire->assignRole('gestionnaire');

    $this->residence = Residence::withoutGlobalScopes()->create([
        'tenant_id' => $this->tenant->id, 'gestionnaire_id' => $this->gestionnaire->id,
        'name' => 'Résidence Atlas', 'address' => 'Rue X', 'city' => 'Casablanca',
        'total_tantieme' => 1000, 'nb_lots' => 0, 'status' => 'active', 'mode_cotisation' => 'tantieme',
    ]);

    $this->immeuble = Immeuble::withoutGlobalScopes()->create([
        'tenant_id' => $this->tenant->id, 'residence_id' => $this->residence->id,
        'nom' => 'Bât A', 'nb_etages' => 5, 'nb_lots' => 0,
    ]);

    $this->auth = ['Authorization' => 'Bearer '.$this->gestionnaire->createToken('t')->plainTextToken];

    $this->makeLot = function (string $numero, float $tantieme = 100) {
        return Lot::create([
            'tenant_id' => $this->tenant->id, 'residence_id' => $this->residence->id,
            'immeuble_id' => $this->immeuble->id, 'numero' => $numero,
            'type' => 'appartement', 'etage' => 1, 'tantieme' => $tantieme,
        ]);
    };
});

it('crée un nouveau copropriétaire quand le téléphone est inédit', function () {
    $lot = ($this->makeLot)('A01');

    $this->withHeaders($this->auth)
        ->postJson('/api/gestionnaire/coproprietaires', [
            'name' => 'Hassan Benali', 'phone' => '+212611100001',
            'lot_id' => $lot->id, 'residence_id' => $this->residence->id,
        ])
        ->assertStatus(201)
        ->assertJsonPath('data.reused', false);

    expect(User::where('phone', '+212611100001')->where('role', 'resident')->count())->toBe(1);
});

it('rattache un copropriétaire EXISTANT à un nouveau lot au lieu de 422', function () {
    $lot1 = ($this->makeLot)('A01');
    $lot2 = ($this->makeLot)('A02');

    // 1er lot
    $this->withHeaders($this->auth)->postJson('/api/gestionnaire/coproprietaires', [
        'name' => 'Hassan Benali', 'phone' => '+212611100001',
        'lot_id' => $lot1->id, 'residence_id' => $this->residence->id,
    ])->assertStatus(201);

    // même personne, 2e lot → rattachement, pas de 422
    $res = $this->withHeaders($this->auth)->postJson('/api/gestionnaire/coproprietaires', [
        'name' => 'Hassan Benali', 'phone' => '+212611100001',
        'lot_id' => $lot2->id, 'residence_id' => $this->residence->id,
    ])->assertStatus(201)
        ->assertJsonPath('data.reused', true)
        ->assertJsonPath('data.temp_password', null);

    // un seul user, deux liens copro
    expect(User::where('phone', '+212611100001')->count())->toBe(1);
    $user = User::where('phone', '+212611100001')->first();
    expect(Coproprietaire::where('user_id', $user->id)->count())->toBe(2);
});

it('restaure un copropriétaire soft-deleted quand on le ré-ajoute', function () {
    $lot1 = ($this->makeLot)('A01');
    $lot2 = ($this->makeLot)('A02');

    $this->withHeaders($this->auth)->postJson('/api/gestionnaire/coproprietaires', [
        'name' => 'Hassan', 'phone' => '+212611100001',
        'lot_id' => $lot1->id, 'residence_id' => $this->residence->id,
    ])->assertStatus(201);

    User::where('phone', '+212611100001')->first()->delete(); // soft

    $this->withHeaders($this->auth)->postJson('/api/gestionnaire/coproprietaires', [
        'name' => 'Hassan', 'phone' => '+212611100001',
        'lot_id' => $lot2->id, 'residence_id' => $this->residence->id,
    ])->assertStatus(201)->assertJsonPath('data.reused', true);

    $user = User::where('phone', '+212611100001')->first();
    expect($user)->not->toBeNull()
        ->and($user->trashed())->toBeFalse();
});

it('refuse 422 si déjà copropriétaire du même lot', function () {
    $lot = ($this->makeLot)('A01');

    $this->withHeaders($this->auth)->postJson('/api/gestionnaire/coproprietaires', [
        'name' => 'Hassan', 'phone' => '+212611100001',
        'lot_id' => $lot->id, 'residence_id' => $this->residence->id,
    ])->assertStatus(201);

    $this->withHeaders($this->auth)->postJson('/api/gestionnaire/coproprietaires', [
        'name' => 'Hassan', 'phone' => '+212611100001',
        'lot_id' => $lot->id, 'residence_id' => $this->residence->id,
    ])->assertStatus(422)->assertJsonPath('errors.lot_id.0', fn ($m) => str_contains($m, 'déjà'));
});

it('refuse 422 si le téléphone appartient à un autre cabinet', function () {
    // Autre tenant + un user avec ce téléphone
    $other = Tenant::create([
        'name' => 'Autre Syndic', 'email' => 'autre@syndic.ma',
        'subdomain' => 'autre', 'plan' => 'starter', 'status' => 'active',
    ]);
    User::create([
        'tenant_id' => $other->id, 'name' => 'Déjà ailleurs',
        'phone' => '+212611999999', 'role' => 'resident', 'status' => 'active',
    ]);

    $lot = ($this->makeLot)('A01');

    $this->withHeaders($this->auth)->postJson('/api/gestionnaire/coproprietaires', [
        'name' => 'Conflit', 'phone' => '+212611999999',
        'lot_id' => $lot->id, 'residence_id' => $this->residence->id,
    ])->assertStatus(422)->assertJsonPath('errors.phone.0', fn ($m) => str_contains($m, 'autre cabinet'));
});

it('assigne le rôle Spatie resident au copro créé (sinon 403 sur le portail)', function () {
    $lot = ($this->makeLot)('A09');

    $this->withHeaders($this->auth)->postJson('/api/gestionnaire/coproprietaires', [
        'name' => 'Karim', 'phone' => '+212611100009',
        'lot_id' => $lot->id, 'residence_id' => $this->residence->id,
    ])->assertStatus(201);

    expect(User::where('phone', '+212611100009')->first()->hasRole('resident'))->toBeTrue();
});
