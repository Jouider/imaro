<?php

use App\Jobs\SendNativePushJob;
use App\Models\Annonce;
use App\Models\AppelFonds;
use App\Models\AppelFondsLigne;
use App\Models\Coproprietaire;
use App\Models\Exercice;
use App\Models\Immeuble;
use App\Models\Lot;
use App\Models\Residence;
use App\Models\Tenant;
use App\Models\Ticket;
use App\Models\User;
use App\Models\Visite;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Queue;
use Spatie\Permission\Models\Role;

uses(RefreshDatabase::class);

beforeEach(function () {
    Queue::fake();
    foreach (['manager', 'resident'] as $r) {
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
    $this->lot = Lot::withoutGlobalScope('tenant')->create(['tenant_id' => $this->tenant->id, 'residence_id' => $this->residence->id, 'immeuble_id' => $imm->id, 'numero' => 'A1', 'type' => 'appartement', 'etage' => 1, 'tantieme' => 1000]);
    $this->resident = User::create(['tenant_id' => $this->tenant->id, 'name' => 'Hassan', 'phone' => '+212611111111', 'role' => 'resident', 'status' => 'active']);
    $this->resident->assignRole('resident');
    $this->copro = Coproprietaire::create(['tenant_id' => $this->tenant->id, 'user_id' => $this->resident->id, 'lot_id' => $this->lot->id, 'type' => 'proprietaire', 'solde_actuel' => 0]);

    $this->auth = ['Authorization' => 'Bearer '.$this->manager->createToken('t')->plainTextToken];
});

it('publier une annonce déclenche un push aux résidents', function () {
    $annonce = Annonce::create([
        'tenant_id' => $this->tenant->id, 'residence_id' => $this->residence->id, 'created_by' => $this->manager->id,
        'titre' => 'Coupure eau', 'contenu' => 'Demain matin', 'priorite' => 'urgente', 'statut' => 'brouillon',
    ]);

    $this->withHeaders($this->auth)->postJson("/api/gestionnaire/annonces/{$annonce->id}/publier")->assertStatus(200);

    Queue::assertPushed(SendNativePushJob::class, fn ($job) => $job->userId === $this->resident->id && $job->data['route'] === '/portail');
});

it('relancer une créance déclenche un push de rappel au copropriétaire', function () {
    $ex = Exercice::withoutGlobalScope('tenant')->create(['tenant_id' => $this->tenant->id, 'residence_id' => $this->residence->id, 'annee' => 2026, 'date_debut' => '2026-01-01', 'date_fin' => '2026-12-31', 'statut' => 'actif']);
    $appel = AppelFonds::withoutGlobalScope('tenant')->create(['tenant_id' => $this->tenant->id, 'residence_id' => $this->residence->id, 'exercice_id' => $ex->id, 'created_by' => $this->manager->id, 'libelle' => 'Charges', 'montant_total' => 1000, 'date_echeance' => '2026-03-31', 'statut' => 'envoye', 'sent_at' => now()]);
    $ligne = AppelFondsLigne::create(['appel_fonds_id' => $appel->id, 'coproprietaire_id' => $this->copro->id, 'lot_id' => $this->lot->id, 'montant_du' => 1000, 'montant_paye' => 0, 'statut' => 'impaye']);

    $this->withHeaders($this->auth)->postJson("/api/gestionnaire/creances/{$ligne->id}/relancer")->assertStatus(200);

    Queue::assertPushed(SendNativePushJob::class, fn ($job) => $job->userId === $this->resident->id && $job->data['route'] === '/portail/finances');
});

it('clore un ticket déclenche un push à l\'auteur', function () {
    $ticket = Ticket::create([
        'tenant_id' => $this->tenant->id, 'residence_id' => $this->residence->id, 'user_id' => $this->resident->id, 'lot_id' => $this->lot->id,
        'categorie' => 'plomberie', 'description' => 'Fuite', 'priorite' => 'normal', 'statut' => 'ouvert',
    ]);

    $this->withHeaders($this->auth)->postJson("/api/gestionnaire/tickets/{$ticket->id}/clos")->assertStatus(200);

    Queue::assertPushed(SendNativePushJob::class, fn ($job) => $job->userId === $this->resident->id && $job->data['route'] === '/portail/reclamations');
});

it('un walk-in notifie l\'hôte de l\'arrivée du visiteur (KAN-135)', function () {
    $this->withHeaders($this->auth)->postJson('/api/visites/walk-in', [
        'residence_id' => $this->residence->id,
        'visitor_name' => 'Livreur Amazon',
        'visitor_phone' => '+212622222222',
        'type' => 'delivery',
        'host_lot_id' => $this->lot->id,
    ])->assertStatus(201);

    Queue::assertPushed(SendNativePushJob::class, fn ($job) => $job->userId === $this->resident->id && $job->data['route'] === '/portail');
});

it('scanner un laissez-passer à l\'arrivée notifie l\'hôte (KAN-135)', function () {
    $visite = Visite::create([
        'tenant_id' => $this->tenant->id,
        'residence_id' => $this->residence->id,
        'qr_token' => Visite::generateToken(),
        'visitor_name' => 'Plombier',
        'visitor_phone' => '+212633333333',
        'type' => 'contractor',
        'host_lot_id' => $this->lot->id,
        'status' => 'planned',
        'planned_at' => null,
    ]);

    $this->withHeaders($this->auth)->postJson('/api/visites/scan', ['token' => $visite->qr_token])->assertStatus(200);

    Queue::assertPushed(SendNativePushJob::class, fn ($job) => $job->userId === $this->resident->id && $job->data['route'] === '/portail');
});

it('un walk-in sans hôte rattaché ne pousse aucune notification (KAN-135)', function () {
    $this->withHeaders($this->auth)->postJson('/api/visites/walk-in', [
        'residence_id' => $this->residence->id,
        'visitor_name' => 'Anonyme',
        'visitor_phone' => '+212644444444',
        'type' => 'visitor',
    ])->assertStatus(201);

    Queue::assertNotPushed(SendNativePushJob::class);
});
