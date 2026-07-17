<?php

use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Role;

uses(RefreshDatabase::class);

beforeEach(function () {
    Role::firstOrCreate(['name' => 'manager', 'guard_name' => 'web']);

    $this->tenant = Tenant::create(['name' => 'T', 'email' => 't@t.ma', 'subdomain' => 't', 'plan' => 'business', 'status' => 'active']);
    config(['app.tenant_id' => $this->tenant->id]);
    $this->manager = User::create(['tenant_id' => $this->tenant->id, 'name' => 'Mgr', 'phone' => '+212600000001', 'role' => 'manager', 'status' => 'active']);
    $this->manager->assignRole('manager');
    $this->auth = ['Authorization' => 'Bearer '.$this->manager->createToken('t')->plainTextToken];
});

// KAN-111 — les endpoints IA sont désactivés par défaut (FEATURE_IA=false).
it('bloque l\'assistant IA quand la feature est désactivée (503)', function () {
    config(['features.ia' => false]);

    $this->withHeaders($this->auth)->getJson('/api/gestionnaire/assistant/faq')
        ->assertStatus(503);
});

it('laisse passer l\'assistant IA quand la feature est activée', function () {
    config(['features.ia' => true]);

    $this->withHeaders($this->auth)->getJson('/api/gestionnaire/assistant/faq')
        ->assertStatus(200);
});

// KAN-114 — le type « locataire » n'est plus accepté à la création d'un copropriétaire.
it('refuse le type locataire (422)', function () {
    config(['features.ia' => false]);

    $this->withHeaders($this->auth)->postJson('/api/gestionnaire/coproprietaires', [
        'name' => 'Test',
        'phone' => '+212611000010',
        'residence_id' => null,
        'type' => 'locataire',
    ])->assertStatus(422)->assertJsonValidationErrors(['type']);
});
