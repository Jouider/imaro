<?php

use App\Models\Depense;
use App\Models\Exercice;
use App\Models\Prestataire;
use App\Models\Residence;
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

it('supprime un prestataire non référencé (KAN-115)', function () {
    $p = Prestataire::create(['tenant_id' => $this->tenant->id, 'nom' => 'Ali', 'telephone' => '+212611111111', 'specialite' => 'plomberie', 'statut' => 'actif']);

    $this->withHeaders($this->auth)->deleteJson("/api/gestionnaire/prestataires/{$p->id}")
        ->assertStatus(200);

    expect(Prestataire::withoutGlobalScope('tenant')->find($p->id))->toBeNull();
});

it('refuse la suppression d\'un prestataire lié à une dépense (422)', function () {
    $residence = Residence::withoutGlobalScope('tenant')->create(['tenant_id' => $this->tenant->id, 'gestionnaire_id' => $this->manager->id, 'name' => 'Atlas', 'address' => 'X', 'city' => 'Casa', 'total_tantieme' => 1000, 'nb_lots' => 1, 'status' => 'active', 'mode_cotisation' => 'tantieme']);
    $ex = Exercice::withoutGlobalScope('tenant')->create(['tenant_id' => $this->tenant->id, 'residence_id' => $residence->id, 'annee' => 2026, 'date_debut' => '2026-01-01', 'date_fin' => '2026-12-31', 'statut' => 'actif']);
    $p = Prestataire::create(['tenant_id' => $this->tenant->id, 'nom' => 'Ali', 'telephone' => '+212611111111', 'specialite' => 'plomberie', 'statut' => 'actif']);
    Depense::create(['tenant_id' => $this->tenant->id, 'exercice_id' => $ex->id, 'residence_id' => $residence->id, 'prestataire_id' => $p->id, 'created_by' => $this->manager->id, 'description' => 'Fuite', 'categorie' => 'autre', 'montant' => 500, 'date' => '2026-06-10', 'statut' => 'en_attente']);

    $this->withHeaders($this->auth)->deleteJson("/api/gestionnaire/prestataires/{$p->id}")
        ->assertStatus(422);

    expect(Prestataire::withoutGlobalScope('tenant')->find($p->id))->not->toBeNull();
});
