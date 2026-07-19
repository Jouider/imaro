<?php

/**
 * KAN-125 — le Journal comptable (section Comptabilité) doit aussi stocker et
 * renvoyer la pièce justificative, comme le module Dépenses (finance).
 */

use App\Models\Depense;
use App\Models\Exercice;
use App\Models\Residence;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Spatie\Permission\Models\Role;

uses(RefreshDatabase::class);

beforeEach(function () {
    Role::firstOrCreate(['name' => 'manager', 'guard_name' => 'web']);
    Storage::fake('public');

    $this->tenant = Tenant::create(['name' => 'T', 'email' => 't@t.ma', 'subdomain' => 't', 'plan' => 'business', 'status' => 'active']);
    config(['app.tenant_id' => $this->tenant->id]);
    $this->manager = User::create(['tenant_id' => $this->tenant->id, 'name' => 'Mgr', 'phone' => '+212600000001', 'role' => 'manager', 'status' => 'active']);
    $this->manager->assignRole('manager');
    $this->auth = ['Authorization' => 'Bearer '.$this->manager->createToken('t')->plainTextToken];

    $this->residence = Residence::withoutGlobalScope('tenant')->create(['tenant_id' => $this->tenant->id, 'gestionnaire_id' => $this->manager->id, 'name' => 'R1', 'address' => 'X', 'city' => 'Casa', 'total_tantieme' => 1000, 'nb_lots' => 0, 'status' => 'active', 'mode_cotisation' => 'tantieme']);
    $this->exercice = Exercice::withoutGlobalScope('tenant')->create(['tenant_id' => $this->tenant->id, 'residence_id' => $this->residence->id, 'annee' => 2026, 'date_debut' => '2026-01-01', 'date_fin' => '2026-12-31', 'statut' => 'actif']);
    $this->base = "/api/gestionnaire/comptabilite/exercices/{$this->exercice->id}/depenses";
});

it('crée une dépense de journal avec justificatif (fichier stocké + URL)', function () {
    $res = $this->withHeaders($this->auth)->post($this->base, [
        'description' => 'Facture gardiennage',
        'categorie' => 'gardiennage',
        'montant' => 1500,
        'date' => '2026-02-10',
        'justificatif' => UploadedFile::fake()->create('facture.pdf', 200, 'application/pdf'),
    ])->assertStatus(201);

    $depense = Depense::where('description', 'Facture gardiennage')->firstOrFail();
    expect($depense->facture_path)->not->toBeNull();
    Storage::disk('public')->assertExists($depense->facture_path);
    expect($res->json('data.depense.justificatif_path'))->toContain($depense->facture_path);
});

it('crée une dépense de journal sans justificatif (201, URL nulle)', function () {
    $this->withHeaders($this->auth)->postJson($this->base, [
        'description' => 'Ménage',
        'categorie' => 'nettoyage',
        'montant' => 300,
        'date' => '2026-02-11',
    ])->assertStatus(201)
        ->assertJsonPath('data.depense.justificatif_path', null);
});

it('refuse un justificatif de type non autorisé (422)', function () {
    $this->withHeaders($this->auth)->post($this->base, [
        'description' => 'X', 'categorie' => 'autre', 'montant' => 10, 'date' => '2026-02-13',
        'justificatif' => UploadedFile::fake()->create('malware.exe', 10, 'application/octet-stream'),
    ])->assertStatus(422)->assertJsonValidationErrors(['justificatif']);
});
