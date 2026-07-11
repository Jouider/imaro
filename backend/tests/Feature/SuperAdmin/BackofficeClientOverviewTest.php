<?php

use App\Models\AppelFonds;
use App\Models\Coproprietaire;
use App\Models\Exercice;
use App\Models\Immeuble;
use App\Models\Lot;
use App\Models\Paiement;
use App\Models\Residence;
use App\Models\Tenant;
use App\Models\Ticket;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Role;

uses(RefreshDatabase::class);

beforeEach(function () {
    foreach (['super_admin', 'manager'] as $r) {
        Role::firstOrCreate(['name' => $r, 'guard_name' => 'web']);
    }

    $ops = Tenant::create(['name' => 'Digitoyou', 'email' => 'ops@imaro.ma', 'subdomain' => 'ops', 'plan' => 'enterprise', 'status' => 'active']);
    $this->admin = User::create(['tenant_id' => $ops->id, 'name' => 'Admin', 'phone' => '+212600000000', 'role' => 'super_admin', 'status' => 'active']);
    $this->admin->assignRole('super_admin');
    $this->auth = ['Authorization' => 'Bearer '.$this->admin->createToken('t')->plainTextToken];

    // Client business avec un parc + une équipe + des réclamations + des finances.
    $this->client = Tenant::create(['name' => 'Gest Syndic A', 'email' => 'a@a.ma', 'subdomain' => 'a', 'plan' => 'business', 'status' => 'active']);
    $tid = $this->client->id;

    $res = Residence::withoutGlobalScope('tenant')->create(['tenant_id' => $tid, 'name' => 'R1', 'address' => 'X', 'city' => 'Casa', 'total_tantieme' => 1000, 'nb_lots' => 0, 'status' => 'active', 'mode_cotisation' => 'tantieme']);

    $manager = User::create(['tenant_id' => $tid, 'name' => 'Mgr', 'phone' => '+212600000001', 'role' => 'manager', 'status' => 'active', 'last_login_at' => now()->subDay()]);
    User::create(['tenant_id' => $tid, 'name' => 'Gest', 'phone' => '+212600000002', 'role' => 'gestionnaire', 'status' => 'active', 'equipe_residence_ids' => [$res->id]]);
    User::create(['tenant_id' => $tid, 'name' => 'Res1', 'phone' => '+212600000003', 'role' => 'resident', 'status' => 'active']);
    User::create(['tenant_id' => $tid, 'name' => 'Res2', 'phone' => '+212600000004', 'role' => 'resident', 'status' => 'active']);

    // Réclamations : 1 urgent ouvert, 1 en_cours, 1 clos (résolu en 5h, noté 4/5).
    Ticket::create(['tenant_id' => $tid, 'residence_id' => $res->id, 'user_id' => $manager->id, 'categorie' => 'ascenseur', 'description' => 'panne', 'priorite' => 'urgent', 'statut' => 'ouvert']);
    Ticket::create(['tenant_id' => $tid, 'residence_id' => $res->id, 'user_id' => $manager->id, 'categorie' => 'plomberie', 'description' => 'fuite', 'priorite' => 'normal', 'statut' => 'en_cours']);
    Ticket::create(['tenant_id' => $tid, 'residence_id' => $res->id, 'user_id' => $manager->id, 'categorie' => 'autre', 'description' => 'divers', 'priorite' => 'faible', 'statut' => 'clos', 'note_satisfaction' => 4, 'created_at' => now()->subHours(5), 'closed_at' => now()]);

    // Finances : exercice actif, appel 10 000 MAD, encaissé 6 000 MAD.
    $ex = Exercice::withoutGlobalScope('tenant')->create(['tenant_id' => $tid, 'residence_id' => $res->id, 'annee' => 2026, 'date_debut' => '2026-01-01', 'date_fin' => '2026-12-31', 'statut' => 'actif']);
    AppelFonds::withoutGlobalScope('tenant')->create(['tenant_id' => $tid, 'residence_id' => $res->id, 'exercice_id' => $ex->id, 'created_by' => $manager->id, 'libelle' => 'Q1', 'montant_total' => 10000, 'date_echeance' => '2026-03-31', 'statut' => 'envoye']);
    $imm = Immeuble::withoutGlobalScope('tenant')->create(['tenant_id' => $tid, 'residence_id' => $res->id, 'nom' => 'Bloc A']);
    $lot = Lot::create(['tenant_id' => $tid, 'residence_id' => $res->id, 'immeuble_id' => $imm->id, 'numero' => 'A1', 'type' => 'appartement', 'tantieme' => 100]);
    $copro = Coproprietaire::create(['tenant_id' => $tid, 'user_id' => $manager->id, 'lot_id' => $lot->id, 'type' => 'proprietaire']);
    Paiement::create(['tenant_id' => $tid, 'exercice_id' => $ex->id, 'coproprietaire_id' => $copro->id, 'saisi_par' => $manager->id, 'montant' => 6000, 'mode' => 'virement', 'statut' => 'paye', 'date_paiement' => '2026-02-01']);
});

it('retourne la vue 360° agrégée d\'un client', function () {
    $res = $this->withHeaders($this->auth)->getJson("/api/admin/tenants/{$this->client->id}/overview")
        ->assertStatus(200);

    // Usagers : 4 comptes (1 manager, 1 gestionnaire, 2 residents).
    $res->assertJsonPath('data.overview.usagers.total', 4)
        ->assertJsonPath('data.overview.usagers.par_role.gestionnaire', 1)
        ->assertJsonPath('data.overview.usagers.par_role.resident', 2);

    // Gestionnaires + charge (1 résidence gérée).
    $res->assertJsonPath('data.overview.gestionnaires.total', 1)
        ->assertJsonPath('data.overview.gestionnaires.charge.0.residences', 1);

    // Parc.
    $res->assertJsonPath('data.overview.parc.residences', 1)
        ->assertJsonPath('data.overview.parc.lots', 1)
        ->assertJsonPath('data.overview.parc.exercices_actifs', 1);

    // Réclamations.
    $res->assertJsonPath('data.overview.reclamations.total', 3)
        ->assertJsonPath('data.overview.reclamations.par_statut.clos', 1)
        ->assertJsonPath('data.overview.reclamations.urgents_ouverts', 1);

    // Finances : 10 000 appelés, 6 000 encaissés, 4 000 impayés, 60% recouvrement.
    $res->assertJsonPath('data.overview.finances.exercice_actif', 2026)
        ->assertJsonPath('data.overview.finances.appels_total_mad', 10000)
        ->assertJsonPath('data.overview.finances.encaisse_mad', 6000)
        ->assertJsonPath('data.overview.finances.impayes_mad', 4000)
        ->assertJsonPath('data.overview.finances.taux_recouvrement', 60);

    // Abonnement : plan business, quotas calculés (4 users vs limite 50).
    $res->assertJsonPath('data.overview.abonnement.plan', 'business')
        ->assertJsonPath('data.overview.abonnement.quotas.2.ressource', 'Utilisateurs')
        ->assertJsonPath('data.overview.abonnement.quotas.2.used', 4)
        ->assertJsonPath('data.overview.abonnement.quotas.2.limit', 50);
});

it('inclut un bloc usage dans les métriques globales', function () {
    $this->withHeaders($this->auth)->getJson('/api/admin/metrics')
        ->assertStatus(200)
        ->assertJsonPath('data.usage.tickets_ouverts', 2)   // ouvert + en_cours
        ->assertJsonPath('data.usage.utilisateurs_actifs_30j', fn ($v) => is_int($v));
});

it('refuse un non super_admin (403)', function () {
    $mgr = User::create(['tenant_id' => $this->client->id, 'name' => 'M', 'phone' => '+212600000099', 'role' => 'manager', 'status' => 'active']);
    $mgr->assignRole('manager');
    $mgrAuth = ['Authorization' => 'Bearer '.$mgr->createToken('t')->plainTextToken];

    $this->withHeaders($mgrAuth)->getJson("/api/admin/tenants/{$this->client->id}/overview")->assertStatus(403);
});
