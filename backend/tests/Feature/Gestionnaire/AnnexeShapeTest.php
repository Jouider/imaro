<?php

use App\Models\AppelFonds;
use App\Models\AppelFondsLigne;
use App\Models\Coproprietaire;
use App\Models\Depense;
use App\Models\Exercice;
use App\Models\Immeuble;
use App\Models\Lot;
use App\Models\Paiement;
use App\Models\Residence;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Role;

uses(RefreshDatabase::class);

beforeEach(function () {
    foreach (['manager', 'gestionnaire', 'resident'] as $r) {
        Role::firstOrCreate(['name' => $r, 'guard_name' => 'web']);
    }

    $this->tenant = Tenant::create(['name' => 'T', 'email' => 't@t.ma', 'subdomain' => 't', 'plan' => 'business', 'status' => 'active']);
    config(['app.tenant_id' => $this->tenant->id]);

    $this->manager = User::create(['tenant_id' => $this->tenant->id, 'name' => 'Mgr', 'phone' => '+212600000001', 'role' => 'manager', 'status' => 'active']);
    $this->manager->assignRole('manager');

    $this->residence = Residence::withoutGlobalScope('tenant')->create([
        'tenant_id' => $this->tenant->id, 'gestionnaire_id' => $this->manager->id, 'name' => 'Aqualina',
        'address' => 'X', 'city' => 'Casa', 'total_tantieme' => 1000, 'nb_lots' => 1, 'status' => 'active', 'mode_cotisation' => 'tantieme',
    ]);
    $imm = Immeuble::withoutGlobalScope('tenant')->create(['tenant_id' => $this->tenant->id, 'residence_id' => $this->residence->id, 'nom' => 'A', 'nb_etages' => 1, 'nb_lots' => 1]);
    $lot = Lot::withoutGlobalScope('tenant')->create(['tenant_id' => $this->tenant->id, 'residence_id' => $this->residence->id, 'immeuble_id' => $imm->id, 'numero' => 'A1', 'type' => 'appartement', 'etage' => 1, 'tantieme' => 1000]);

    $resident = User::create(['tenant_id' => $this->tenant->id, 'name' => 'Hassan', 'phone' => '+212611111111', 'role' => 'resident', 'status' => 'active']);
    $copro = Coproprietaire::create(['tenant_id' => $this->tenant->id, 'user_id' => $resident->id, 'lot_id' => $lot->id, 'type' => 'proprietaire', 'solde_actuel' => 0]);

    $ex = Exercice::withoutGlobalScope('tenant')->create(['tenant_id' => $this->tenant->id, 'residence_id' => $this->residence->id, 'annee' => 2026, 'date_debut' => '2026-01-01', 'date_fin' => '2026-12-31', 'statut' => 'actif']);
    $appel = AppelFonds::withoutGlobalScope('tenant')->create(['tenant_id' => $this->tenant->id, 'residence_id' => $this->residence->id, 'exercice_id' => $ex->id, 'created_by' => $this->manager->id, 'libelle' => 'Charges', 'montant_total' => 1000, 'date_echeance' => '2026-03-31', 'statut' => 'envoye', 'sent_at' => now()]);
    AppelFondsLigne::create(['appel_fonds_id' => $appel->id, 'coproprietaire_id' => $copro->id, 'lot_id' => $lot->id, 'montant_du' => 1000, 'montant_paye' => 600, 'statut' => 'partiel']);
    Paiement::create(['tenant_id' => $this->tenant->id, 'exercice_id' => $ex->id, 'coproprietaire_id' => $copro->id, 'saisi_par' => $this->manager->id, 'montant' => 600, 'mode' => 'virement', 'date_paiement' => '2026-04-01']);
    Depense::create(['tenant_id' => $this->tenant->id, 'exercice_id' => $ex->id, 'residence_id' => $this->residence->id, 'created_by' => $this->manager->id, 'description' => 'Entretien ascenseur', 'categorie' => 'entretien', 'montant' => 300, 'date' => '2026-05-01']);

    $this->auth = ['Authorization' => 'Bearer '.$this->manager->createToken('t')->plainTextToken];
    $this->base = "/api/gestionnaire/residences/{$this->residence->id}/annexes";
});

it('annexe 10 renvoie la forme {totals, rows} attendue par le PDF', function () {
    $this->withHeaders($this->auth)->getJson("{$this->base}/10?exercice=2026")
        ->assertStatus(200)
        ->assertJsonPath('data.totals.appele', 1000)
        ->assertJsonPath('data.totals.paye', 600)
        ->assertJsonPath('data.totals.soldeFinal', -400)
        ->assertJsonCount(1, 'data.rows')
        ->assertJsonPath('data.rows.0.lotNumero', 'A1')
        ->assertJsonPath('data.rows.0.coproprietaireNom', 'Hassan');
});

it('annexe 13-1 renvoie {current, previous} avec créances et trésorerie', function () {
    $this->withHeaders($this->auth)->getJson("{$this->base}/13-1?exercice=2026")
        ->assertStatus(200)
        ->assertJsonPath('data.current.creances', 400)     // 1000 appelé − 600 payé
        ->assertJsonPath('data.current.tresorerie', 300)   // 600 payé − 300 dépensé
        ->assertJsonStructure(['data' => ['current' => ['fondsReserve', 'creances', 'dettes', 'tresorerie'], 'previous']]);
});

it('annexe 13-2 renvoie {excedent, recettes, depenses} en colonnes Quad', function () {
    $this->withHeaders($this->auth)->getJson("{$this->base}/13-2?exercice=2026")
        ->assertStatus(200)
        ->assertJsonPath('data.excedent', 700)                          // 1000 − 300
        ->assertJsonPath('data.recettes.cotisations.n', 1000)
        ->assertJsonPath('data.depenses.servicesExterieurs.n', 300)     // entretien → services extérieurs
        ->assertJsonStructure(['data' => ['recettes' => ['cotisations' => ['n1', 'n', 'n0', 'nMinus1']]]]);
});
