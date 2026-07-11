<?php

use App\Models\AppelFonds;
use App\Models\AppelFondsLigne;
use App\Models\Coproprietaire;
use App\Models\Exercice;
use App\Models\Immeuble;
use App\Models\Lot;
use App\Models\NotificationLog;
use App\Models\RelanceScenario;
use App\Models\Residence;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Queue;
use Spatie\Permission\Models\Role;

uses(RefreshDatabase::class);

beforeEach(function () {
    Queue::fake();
    Role::firstOrCreate(['name' => 'manager', 'guard_name' => 'web']);

    $this->tenant = Tenant::create(['name' => 'T', 'email' => 't@t.ma', 'subdomain' => 't', 'plan' => 'business', 'status' => 'active']);
    config(['app.tenant_id' => $this->tenant->id]);
    $this->manager = User::create(['tenant_id' => $this->tenant->id, 'name' => 'Mgr', 'phone' => '+212600000001', 'role' => 'manager', 'status' => 'active']);
    $this->manager->assignRole('manager');
    $this->residence = Residence::withoutGlobalScope('tenant')->create(['tenant_id' => $this->tenant->id, 'gestionnaire_id' => $this->manager->id, 'name' => 'Atlas', 'address' => 'X', 'city' => 'Casa', 'total_tantieme' => 1000, 'nb_lots' => 1, 'status' => 'active', 'mode_cotisation' => 'tantieme']);
    $this->auth = ['Authorization' => 'Bearer '.$this->manager->createToken('t')->plainTextToken];
});

it('GET renvoie un scénario par défaut (désactivé, sans étapes)', function () {
    $this->withHeaders($this->auth)->getJson("/api/gestionnaire/residences/{$this->residence->id}/relance-scenario")
        ->assertStatus(200)
        ->assertJsonPath('data.scenario.enabled', false)
        ->assertJsonPath('data.scenario.steps', []);
});

it('PUT enregistre les étapes et GET les renvoie', function () {
    $this->withHeaders($this->auth)->putJson("/api/gestionnaire/residences/{$this->residence->id}/relance-scenario", [
        'enabled' => true,
        'steps' => [
            ['delai_jours' => 7, 'canal' => 'email', 'type' => 'relance'],
            ['delai_jours' => 30, 'canal' => 'whatsapp', 'type' => 'mise_en_demeure'],
        ],
    ])->assertStatus(200)
        ->assertJsonPath('data.scenario.enabled', true)
        ->assertJsonPath('data.scenario.steps.1.type', 'mise_en_demeure');

    $this->withHeaders($this->auth)->getJson("/api/gestionnaire/residences/{$this->residence->id}/relance-scenario")
        ->assertStatus(200)
        ->assertJsonCount(2, 'data.scenario.steps')
        ->assertJsonPath('data.scenario.steps.0.delai_jours', 7);
});

it('PUT remplace les étapes existantes', function () {
    $this->withHeaders($this->auth)->putJson("/api/gestionnaire/residences/{$this->residence->id}/relance-scenario", [
        'enabled' => true, 'steps' => [['delai_jours' => 5, 'canal' => 'sms', 'type' => 'relance']],
    ]);
    $this->withHeaders($this->auth)->putJson("/api/gestionnaire/residences/{$this->residence->id}/relance-scenario", [
        'enabled' => true, 'steps' => [['delai_jours' => 10, 'canal' => 'email', 'type' => 'relance']],
    ])->assertJsonCount(1, 'data.scenario.steps')
        ->assertJsonPath('data.scenario.steps.0.delai_jours', 10);
});

it('refuse un canal invalide (422)', function () {
    $this->withHeaders($this->auth)->putJson("/api/gestionnaire/residences/{$this->residence->id}/relance-scenario", [
        'enabled' => true, 'steps' => [['delai_jours' => 7, 'canal' => 'pigeon', 'type' => 'relance']],
    ])->assertStatus(422)->assertJsonValidationErrors(['steps.0.canal']);
});

it('la commande relance un impayé dont le retard correspond à une étape (J+X)', function () {
    // Impayé en retard d'exactement 7 jours.
    $imm = Immeuble::withoutGlobalScope('tenant')->create(['tenant_id' => $this->tenant->id, 'residence_id' => $this->residence->id, 'nom' => 'A', 'nb_etages' => 1, 'nb_lots' => 1]);
    $lot = Lot::withoutGlobalScope('tenant')->create(['tenant_id' => $this->tenant->id, 'residence_id' => $this->residence->id, 'immeuble_id' => $imm->id, 'numero' => 'A1', 'type' => 'appartement', 'etage' => 1, 'tantieme' => 1000]);
    $resident = User::create(['tenant_id' => $this->tenant->id, 'name' => 'Hassan', 'phone' => '+212611111111', 'role' => 'resident', 'status' => 'active']);
    $copro = Coproprietaire::create(['tenant_id' => $this->tenant->id, 'user_id' => $resident->id, 'lot_id' => $lot->id, 'type' => 'proprietaire', 'solde_actuel' => 0]);
    $exercice = Exercice::withoutGlobalScope('tenant')->create(['tenant_id' => $this->tenant->id, 'residence_id' => $this->residence->id, 'annee' => 2026, 'date_debut' => '2026-01-01', 'date_fin' => '2026-12-31', 'statut' => 'actif']);
    $appel = AppelFonds::withoutGlobalScope('tenant')->create(['tenant_id' => $this->tenant->id, 'residence_id' => $this->residence->id, 'exercice_id' => $exercice->id, 'created_by' => $this->manager->id, 'libelle' => 'Charges', 'montant_total' => 1000, 'date_echeance' => now()->subDays(7)->toDateString(), 'statut' => 'envoye']);
    AppelFondsLigne::create(['appel_fonds_id' => $appel->id, 'coproprietaire_id' => $copro->id, 'montant_du' => 1000, 'montant_paye' => 0, 'statut' => 'impaye']);

    RelanceScenario::create(['tenant_id' => $this->tenant->id, 'residence_id' => $this->residence->id, 'enabled' => true])
        ->steps()->create(['ordre' => 0, 'delai_jours' => 7, 'canal' => 'email', 'type' => 'relance']);

    $this->artisan('relances:run')->assertSuccessful();

    expect(NotificationLog::where('template_name', 'relance_relance')->where('canal', 'email')->count())->toBe(1);
});

it('ne relance pas si le retard ne correspond à aucune étape', function () {
    $imm = Immeuble::withoutGlobalScope('tenant')->create(['tenant_id' => $this->tenant->id, 'residence_id' => $this->residence->id, 'nom' => 'A', 'nb_etages' => 1, 'nb_lots' => 1]);
    $lot = Lot::withoutGlobalScope('tenant')->create(['tenant_id' => $this->tenant->id, 'residence_id' => $this->residence->id, 'immeuble_id' => $imm->id, 'numero' => 'A1', 'type' => 'appartement', 'etage' => 1, 'tantieme' => 1000]);
    $resident = User::create(['tenant_id' => $this->tenant->id, 'name' => 'H', 'phone' => '+212611111112', 'role' => 'resident', 'status' => 'active']);
    $copro = Coproprietaire::create(['tenant_id' => $this->tenant->id, 'user_id' => $resident->id, 'lot_id' => $lot->id, 'type' => 'proprietaire', 'solde_actuel' => 0]);
    $exercice = Exercice::withoutGlobalScope('tenant')->create(['tenant_id' => $this->tenant->id, 'residence_id' => $this->residence->id, 'annee' => 2026, 'date_debut' => '2026-01-01', 'date_fin' => '2026-12-31', 'statut' => 'actif']);
    $appel = AppelFonds::withoutGlobalScope('tenant')->create(['tenant_id' => $this->tenant->id, 'residence_id' => $this->residence->id, 'exercice_id' => $exercice->id, 'created_by' => $this->manager->id, 'libelle' => 'Charges', 'montant_total' => 1000, 'date_echeance' => now()->subDays(3)->toDateString(), 'statut' => 'envoye']);
    AppelFondsLigne::create(['appel_fonds_id' => $appel->id, 'coproprietaire_id' => $copro->id, 'montant_du' => 1000, 'montant_paye' => 0, 'statut' => 'impaye']);

    RelanceScenario::create(['tenant_id' => $this->tenant->id, 'residence_id' => $this->residence->id, 'enabled' => true])
        ->steps()->create(['ordre' => 0, 'delai_jours' => 7, 'canal' => 'email', 'type' => 'relance']);

    $this->artisan('relances:run')->assertSuccessful();

    expect(NotificationLog::count())->toBe(0);
});
