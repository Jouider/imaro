<?php

use App\Models\Annonce;
use App\Models\AppelFonds;
use App\Models\AppelFondsLigne;
use App\Models\Assemblee;
use App\Models\Coproprietaire;
use App\Models\Document;
use App\Models\Exercice;
use App\Models\Immeuble;
use App\Models\Lot;
use App\Models\Residence;
use App\Models\Tenant;
use App\Models\Ticket;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Role;

uses(RefreshDatabase::class);

beforeEach(function () {
    foreach (['manager', 'gestionnaire', 'conseil', 'resident'] as $r) {
        Role::firstOrCreate(['name' => $r, 'guard_name' => 'web']);
    }

    $this->tenant = Tenant::create(['name' => 'T', 'email' => 't@t.ma', 'subdomain' => 't', 'plan' => 'starter', 'status' => 'active']);
    // NB: on NE pose PAS config(app.tenant_id) — on teste la résolution par SetTenant
    // sur une requête résident (host localhost = exclu → fallback sur l'user authentifié).

    $this->gest = User::create(['tenant_id' => $this->tenant->id, 'name' => 'Gest', 'phone' => '+212600000001', 'role' => 'gestionnaire', 'status' => 'active']);
    $this->residence = Residence::withoutGlobalScope('tenant')->create([
        'tenant_id' => $this->tenant->id, 'gestionnaire_id' => $this->gest->id, 'name' => 'Aqualina',
        'address' => 'X', 'city' => 'Casa', 'total_tantieme' => 1000, 'nb_lots' => 1, 'status' => 'active', 'mode_cotisation' => 'tantieme',
    ]);
    $imm = Immeuble::withoutGlobalScope('tenant')->create(['tenant_id' => $this->tenant->id, 'residence_id' => $this->residence->id, 'nom' => 'A', 'nb_etages' => 1, 'nb_lots' => 1]);
    $this->lot = Lot::withoutGlobalScope('tenant')->create(['tenant_id' => $this->tenant->id, 'residence_id' => $this->residence->id, 'immeuble_id' => $imm->id, 'numero' => 'A1', 'type' => 'appartement', 'etage' => 2, 'tantieme' => 1000]);

    $this->resident = User::create(['tenant_id' => $this->tenant->id, 'name' => 'Hassan', 'phone' => '+212611111111', 'role' => 'resident', 'status' => 'active', 'password' => bcrypt('x')]);
    $this->resident->assignRole('resident');
    $this->copro = Coproprietaire::create(['tenant_id' => $this->tenant->id, 'user_id' => $this->resident->id, 'lot_id' => $this->lot->id, 'type' => 'proprietaire', 'solde_actuel' => 0]);

    // Un appel de fonds + ligne (charge) pour tester les Opérations sans contexte tenant.
    $ex = Exercice::withoutGlobalScope('tenant')->create(['tenant_id' => $this->tenant->id, 'residence_id' => $this->residence->id, 'annee' => 2026, 'date_debut' => '2026-01-01', 'date_fin' => '2026-12-31', 'statut' => 'actif']);
    $appel = AppelFonds::withoutGlobalScope('tenant')->create(['tenant_id' => $this->tenant->id, 'residence_id' => $this->residence->id, 'exercice_id' => $ex->id, 'created_by' => $this->gest->id, 'libelle' => 'Charges T1 2026', 'montant_total' => 1000, 'date_echeance' => '2026-03-31', 'statut' => 'envoye', 'sent_at' => now()]);
    AppelFondsLigne::create(['appel_fonds_id' => $appel->id, 'coproprietaire_id' => $this->copro->id, 'lot_id' => $this->lot->id, 'montant_du' => 1000, 'montant_paye' => 0, 'statut' => 'impaye']);

    Annonce::create(['tenant_id' => $this->tenant->id, 'residence_id' => $this->residence->id, 'created_by' => $this->gest->id, 'titre' => 'Coupure eau', 'contenu' => 'Demain', 'priorite' => 'urgente', 'statut' => 'publiee', 'publiee_at' => now()]);
    Document::create(['tenant_id' => $this->tenant->id, 'residence_id' => $this->residence->id, 'uploaded_by' => $this->gest->id, 'nom' => 'Règlement', 'type' => 'reglement', 'file_path' => 'documents/x.pdf', 'mime_type' => 'application/pdf', 'taille_ko' => 120, 'date' => '2026-01-01']);
    Ticket::create(['tenant_id' => $this->tenant->id, 'residence_id' => $this->residence->id, 'user_id' => $this->resident->id, 'lot_id' => $this->lot->id, 'categorie' => 'plomberie', 'description' => 'Fuite', 'priorite' => 'normal', 'statut' => 'ouvert']);
    Assemblee::create(['tenant_id' => $this->tenant->id, 'residence_id' => $this->residence->id, 'created_by' => $this->gest->id, 'titre' => 'AG 2026', 'type' => 'ordinaire', 'date' => '2026-06-14 15:00:00', 'lieu' => 'Salle', 'quorum_requis' => 50, 'ordre_du_jour' => 'X', 'statut' => 'planifiee']);

    $this->auth = ['Authorization' => 'Bearer '.$this->resident->createToken('t')->plainTextToken];
});

it('le résident voit son lot + sa résidence dans le profil', function () {
    $this->withHeaders($this->auth)->getJson('/api/portail/profil')
        ->assertStatus(200)
        ->assertJsonPath('data.lot.numero', 'A1')
        ->assertJsonPath('data.residence.name', 'Aqualina');
});

it('le résident voit les annonces publiées de sa résidence', function () {
    $this->withHeaders($this->auth)->getJson('/api/portail/annonces')
        ->assertStatus(200)
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.titre', 'Coupure eau');
});

it('le résident voit les documents de sa résidence', function () {
    $this->withHeaders($this->auth)->getJson('/api/portail/documents')
        ->assertStatus(200)
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.titre', 'Règlement');
});

it('le résident voit ses réclamations', function () {
    $this->withHeaders($this->auth)->getJson('/api/portail/reclamations')
        ->assertStatus(200)
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.categorie', 'plomberie');
});

it('le résident voit les assemblées de sa résidence', function () {
    $this->withHeaders($this->auth)->getJson('/api/portail/assemblees')
        ->assertStatus(200)
        ->assertJsonCount(1, 'data');
});

it('le résident crée une réclamation (sujet plié dans la description)', function () {
    $this->withHeaders($this->auth)->postJson('/api/portail/reclamations', [
        'titre' => 'Ascenseur en panne', 'description' => 'Bloqué au 3e', 'categorie' => 'ascenseur', 'priorite' => 'haute',
    ])->assertStatus(201);

    $t = Ticket::where('user_id', $this->resident->id)->where('categorie', 'ascenseur')->first();
    expect($t)->not->toBeNull()
        ->and($t->priorite)->toBe('urgent')        // haute → urgent
        ->and($t->description)->toContain('Ascenseur en panne');
});

it('le résident voit ses charges dans les opérations', function () {
    $this->withHeaders($this->auth)->getJson('/api/portail/operations')
        ->assertStatus(200)
        ->assertJsonCount(1, 'data.appels')
        ->assertJsonPath('data.appels.0.montant_du', 1000);
});

it('le tableau de bord reflète le solde dû', function () {
    $this->withHeaders($this->auth)->getJson('/api/portail/dashboard')
        ->assertStatus(200)
        ->assertJsonPath('data.solde', 1000);
});
