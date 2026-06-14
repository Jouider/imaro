<?php

use App\Models\PersonnelResidence;
use App\Models\Residence;
use App\Models\Tenant;
use App\Models\User;
use App\Services\Notifications\CoproprietaireWelcomeNotifier;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Spatie\Permission\Models\Role;

uses(RefreshDatabase::class);

beforeEach(function () {
    foreach (['manager', 'gestionnaire', 'resident', 'personnel'] as $r) {
        Role::firstOrCreate(['name' => $r, 'guard_name' => 'web']);
    }

    $this->tenant = Tenant::create(['name' => 'T', 'email' => 't@t.ma', 'subdomain' => 't', 'plan' => 'starter', 'status' => 'active']);
    config(['app.tenant_id' => $this->tenant->id]);

    $this->manager = User::create(['tenant_id' => $this->tenant->id, 'name' => 'Fikri', 'phone' => '+212600000001', 'email' => 'm@t.ma', 'role' => 'manager', 'status' => 'active']);
    $this->manager->assignRole('manager');

    $this->residence = Residence::withoutGlobalScopes()->create([
        'tenant_id' => $this->tenant->id, 'gestionnaire_id' => $this->manager->id, 'name' => 'Atlas',
        'address' => 'X', 'city' => 'Casa', 'total_tantieme' => 1000, 'nb_lots' => 0, 'status' => 'active', 'mode_cotisation' => 'tantieme',
    ]);
    $this->auth = ['Authorization' => 'Bearer '.$this->manager->createToken('t')->plainTextToken];
});

it('crée un compte de connexion + envoie le code, renvoie un aperçu masqué', function () {
    // Le notifier ne doit pas réellement envoyer en test, mais être appelé.
    $this->mock(CoproprietaireWelcomeNotifier::class)->shouldReceive('send')->once();

    $res = $this->withHeaders($this->auth)->postJson('/api/gestionnaire/equipe/personnel', [
        'name' => 'Ahmed Gardien', 'poste' => 'gardien',
        'residence_id' => $this->residence->id, 'phone' => '+212611223344',
    ])->assertStatus(201);

    // Aperçu masqué uniquement (jamais le code complet).
    expect($res->json('data.code_apercu'))->toMatch('/^.{2}•+$/u');

    $user = User::where('phone', '+212611223344')->first();
    expect($user)->not->toBeNull()
        ->and($user->role)->toBe('personnel')
        ->and($user->access_code)->not->toBeNull()
        ->and($user->must_change_code)->toBeTrue()
        ->and($user->hasRole('personnel'))->toBeTrue();

    $staff = PersonnelResidence::where('phone', '+212611223344')->first();
    expect($staff->user_id)->toBe($user->id);
});

it('refuse un téléphone déjà utilisé (422)', function () {
    User::create(['tenant_id' => $this->tenant->id, 'name' => 'X', 'phone' => '+212611223344', 'role' => 'resident', 'status' => 'active']);

    $this->withHeaders($this->auth)->postJson('/api/gestionnaire/equipe/personnel', [
        'name' => 'Ahmed', 'poste' => 'gardien', 'residence_id' => $this->residence->id, 'phone' => '+212611223344',
    ])->assertStatus(422)->assertJsonPath('errors.phone.0', fn ($m) => is_string($m));
});

it('le personnel peut se connecter via le login téléphone + code', function () {
    $perso = User::create([
        'tenant_id' => $this->tenant->id, 'name' => 'Ahmed', 'phone' => '+212611223399',
        'role' => 'personnel', 'status' => 'active',
        'access_code' => Hash::make('ABCD1234'), 'must_change_code' => false,
    ]);
    $perso->assignRole('personnel');

    $this->postJson('/api/auth/resident/login', ['phone' => '+212611223399', 'code' => 'ABCD1234'])
        ->assertStatus(200)
        ->assertJsonPath('status', 'success')
        ->assertJsonPath('data.token', fn ($t) => is_string($t) && $t !== '');
});
