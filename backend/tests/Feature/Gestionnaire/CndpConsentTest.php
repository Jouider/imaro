<?php

use App\Models\CndpConsent;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Role;

uses(RefreshDatabase::class);

beforeEach(function () {
    Role::firstOrCreate(['name' => 'manager', 'guard_name' => 'web']);

    $this->tenant = Tenant::create(['name' => 'T', 'email' => 't@t.ma', 'subdomain' => 't', 'plan' => 'starter', 'status' => 'active']);
    config(['app.tenant_id' => $this->tenant->id]);

    $this->manager = User::create(['tenant_id' => $this->tenant->id, 'name' => 'Fikri', 'phone' => '+212600000001', 'email' => 'm@t.ma', 'role' => 'manager', 'status' => 'active']);
    $this->manager->assignRole('manager');
    $this->auth = ['Authorization' => 'Bearer '.$this->manager->createToken('t')->plainTextToken];
});

it('persiste le consentement CNDP (horodatage + version) et l\'historise', function () {
    expect($this->manager->cndp_consent_at)->toBeNull();

    $this->withHeaders($this->auth)
        ->patchJson('/api/gestionnaire/profil', ['cndp_consent' => true])
        ->assertStatus(200)
        ->assertJsonPath('data.profil.cndp_policy_version', '1.0')
        ->assertJsonPath('data.profil.cndp_consent_at', fn ($v) => is_string($v) && $v !== '');

    $this->manager->refresh();
    expect($this->manager->cndp_consent_at)->not->toBeNull()
        ->and($this->manager->cndp_policy_version)->toBe('1.0');

    // Historique opposable
    $consent = CndpConsent::where('user_id', $this->manager->id)->first();
    expect($consent)->not->toBeNull()
        ->and($consent->policy_version)->toBe('1.0')
        ->and($consent->tenant_id)->toBe($this->tenant->id);
});

it('n\'enregistre rien si le consentement n\'est pas coché', function () {
    $this->withHeaders($this->auth)
        ->patchJson('/api/gestionnaire/profil', ['name' => 'Nouveau Nom'])
        ->assertStatus(200)
        ->assertJsonPath('data.profil.cndp_consent_at', null);

    expect(CndpConsent::count())->toBe(0)
        ->and($this->manager->fresh()->cndp_consent_at)->toBeNull();
});

it('respecte une version de politique fournie', function () {
    $this->withHeaders($this->auth)
        ->patchJson('/api/gestionnaire/profil', ['cndp_consent' => true, 'cndp_policy_version' => '2.1'])
        ->assertStatus(200)
        ->assertJsonPath('data.profil.cndp_policy_version', '2.1');

    expect(CndpConsent::where('user_id', $this->manager->id)->first()->policy_version)->toBe('2.1');
});
