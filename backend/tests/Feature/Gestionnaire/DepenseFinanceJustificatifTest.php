<?php

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

    $this->residence = Residence::withoutGlobalScope('tenant')->create(['tenant_id' => $this->tenant->id, 'name' => 'R1', 'address' => 'X', 'city' => 'Casa', 'total_tantieme' => 1000, 'nb_lots' => 0, 'status' => 'active', 'mode_cotisation' => 'tantieme']);
    $this->exercice = Exercice::withoutGlobalScope('tenant')->create(['tenant_id' => $this->tenant->id, 'residence_id' => $this->residence->id, 'annee' => 2026, 'date_debut' => '2026-01-01', 'date_fin' => '2026-12-31', 'statut' => 'actif']);
});

// KAN-124 — la création d'une dépense doit fonctionner (sans fichier).
it('crée une dépense sans justificatif (201)', function () {
    $this->withHeaders($this->auth)->postJson('/api/gestionnaire/depenses-finance', [
        'exercice_id' => $this->exercice->id,
        'residence_id' => $this->residence->id,
        'titre' => 'Facture ascenseur',
        'montant' => 1500,
        'date' => '2026-02-10',
    ])->assertStatus(201)
        ->assertJsonPath('data.justificatif_path', null);

    expect(Depense::where('description', 'Facture ascenseur')->exists())->toBeTrue();
});

// KAN-125 — l'upload de la pièce justificative doit être stocké…
it('crée une dépense avec justificatif (fichier stocké + chemin en base)', function () {
    $res = $this->withHeaders($this->auth)->post('/api/gestionnaire/depenses-finance', [
        'exercice_id' => $this->exercice->id,
        'residence_id' => $this->residence->id,
        'titre' => 'Facture nettoyage',
        'montant' => 800,
        'date' => '2026-02-11',
        'justificatif' => UploadedFile::fake()->create('facture.pdf', 200, 'application/pdf'),
    ])->assertStatus(201);

    $depense = Depense::where('description', 'Facture nettoyage')->first();
    expect($depense->facture_path)->not->toBeNull();
    Storage::disk('public')->assertExists($depense->facture_path);
    // La réponse renvoie l'URL publique du justificatif.
    expect($res->json('data.justificatif_path'))->toContain($depense->facture_path);
});

// KAN-121/125 — …puis affiché : l'index renvoie l'URL du justificatif.
it('renvoie le chemin du justificatif dans la liste', function () {
    $path = UploadedFile::fake()->image('facture.jpg')->store("depenses/{$this->tenant->id}", 'public');
    Depense::create([
        'tenant_id' => $this->tenant->id, 'exercice_id' => $this->exercice->id, 'residence_id' => $this->residence->id,
        'created_by' => $this->manager->id, 'description' => 'Avec pièce', 'categorie' => 'autre',
        'montant' => 300, 'date' => '2026-02-12', 'statut' => 'en_attente', 'facture_path' => $path,
    ]);

    $this->withHeaders($this->auth)->getJson('/api/gestionnaire/depenses-finance?exercice_id='.$this->exercice->id)
        ->assertStatus(200)
        ->assertJsonPath('data.0.justificatif_path', Storage::url($path));
});

// KAN-125 — un type de fichier non autorisé est refusé proprement (422).
it('refuse un justificatif de type non autorisé (422)', function () {
    $this->withHeaders($this->auth)->post('/api/gestionnaire/depenses-finance', [
        'exercice_id' => $this->exercice->id,
        'residence_id' => $this->residence->id,
        'titre' => 'X', 'montant' => 10, 'date' => '2026-02-13',
        'justificatif' => UploadedFile::fake()->create('malware.exe', 10, 'application/octet-stream'),
    ])->assertStatus(422)->assertJsonValidationErrors(['justificatif']);
});
