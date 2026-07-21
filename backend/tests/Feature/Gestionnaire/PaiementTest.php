<?php

use App\Models\AppelFonds;
use App\Models\AppelFondsLigne;
use App\Models\Coproprietaire;
use App\Models\Immeuble;
use App\Models\Lot;
use App\Models\Paiement;
use App\Models\Residence;
use App\Models\Tenant;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Role;

uses(RefreshDatabase::class);

beforeEach(function () {
    foreach (['super_admin', 'manager', 'gestionnaire', 'agent_recouvrement', 'conseil', 'resident'] as $role) {
        Role::firstOrCreate(['name' => $role, 'guard_name' => 'web']);
    }

    $this->tenant = Tenant::create([
        'name' => 'Test Syndic', 'email' => 'test@syndic.ma',
        'subdomain' => 'test', 'plan' => 'starter', 'status' => 'active',
    ]);
    config(['app.tenant_id' => $this->tenant->id]);

    $this->gestionnaire = User::create([
        'tenant_id' => $this->tenant->id, 'name' => 'Karim Gestionnaire',
        'phone' => '+212611000001', 'role' => 'gestionnaire', 'status' => 'active',
    ]);
    $this->gestionnaire->assignRole('gestionnaire');

    $this->residence = Residence::withoutGlobalScopes()->create([
        'tenant_id' => $this->tenant->id, 'gestionnaire_id' => $this->gestionnaire->id,
        'name' => 'Résidence Test', 'address' => 'Rue A', 'city' => 'Casa',
        'total_tantieme' => 1000, 'nb_lots' => 1, 'status' => 'active',
    ]);

    $resident = User::create(['tenant_id' => $this->tenant->id, 'name' => 'Hassan Benali', 'phone' => '+212611000010', 'role' => 'resident', 'status' => 'active']);
    $immeuble = Immeuble::withoutGlobalScopes()->create(['tenant_id' => $this->tenant->id, 'residence_id' => $this->residence->id, 'nom' => 'Immeuble Principal']);
    $lot = Lot::create(['tenant_id' => $this->tenant->id, 'residence_id' => $this->residence->id, 'immeuble_id' => $immeuble->id, 'numero' => 'A01', 'type' => 'appartement', 'etage' => 1, 'tantieme' => 1000]);
    $this->copro = Coproprietaire::create(['tenant_id' => $this->tenant->id, 'user_id' => $resident->id, 'lot_id' => $lot->id, 'type' => 'proprietaire', 'solde_actuel' => 0]);

    $this->af = AppelFonds::withoutGlobalScopes()->create([
        'tenant_id' => $this->tenant->id, 'residence_id' => $this->residence->id,
        'created_by' => $this->gestionnaire->id, 'libelle' => 'Charges Q2',
        'montant_total' => 1000, 'date_echeance' => Carbon::now()->addMonth(),
        'statut' => 'envoye', 'sent_at' => Carbon::now(),
    ]);

    $this->ligne = AppelFondsLigne::create([
        'appel_fonds_id' => $this->af->id,
        'coproprietaire_id' => $this->copro->id,
        'montant_du' => 1000,
        'montant_paye' => 0,
        'statut' => 'impaye',
    ]);

    $this->token = $this->gestionnaire->createToken('test')->plainTextToken;
});

it('records a partial payment and sets ligne statut to partiel', function () {
    $this->withHeaders(['Authorization' => "Bearer {$this->token}"])
        ->postJson('/api/gestionnaire/paiements', [
            'appel_fonds_ligne_id' => $this->ligne->id,
            'montant' => 500,
            'mode' => 'virement',
            'date_paiement' => Carbon::today()->toDateString(),
        ])
        ->assertStatus(201)
        ->assertJsonPath('status', 'success');

    $this->ligne->refresh();
    expect($this->ligne->montant_paye)->toBe(500.0)
        ->and($this->ligne->statut)->toBe('partiel');
});

it('records full payment and sets ligne statut to paye', function () {
    $this->withHeaders(['Authorization' => "Bearer {$this->token}"])
        ->postJson('/api/gestionnaire/paiements', [
            'appel_fonds_ligne_id' => $this->ligne->id,
            'montant' => 1000,
            'mode' => 'cheque',
            'date_paiement' => Carbon::today()->toDateString(),
            'reference' => 'CHQ-001',
        ])
        ->assertStatus(201);

    $this->ligne->refresh();
    expect($this->ligne->statut)->toBe('paye')
        ->and($this->ligne->montant_paye)->toBe(1000.0);
});

it('updates appel de fonds statut to solde when all lines paid', function () {
    $this->withHeaders(['Authorization' => "Bearer {$this->token}"])
        ->postJson('/api/gestionnaire/paiements', [
            'appel_fonds_ligne_id' => $this->ligne->id,
            'montant' => 1000,
            'mode' => 'especes',
            'date_paiement' => Carbon::today()->toDateString(),
        ]);

    expect($this->af->fresh()->statut)->toBe('solde');
});

it('rejects payment on already paid ligne', function () {
    $this->ligne->update(['statut' => 'paye', 'montant_paye' => 1000]);

    $this->withHeaders(['Authorization' => "Bearer {$this->token}"])
        ->postJson('/api/gestionnaire/paiements', [
            'appel_fonds_ligne_id' => $this->ligne->id,
            'montant' => 100,
            'mode' => 'virement',
            'date_paiement' => Carbon::today()->toDateString(),
        ])
        ->assertStatus(422);
});

it('lists impayes for gestionnaire residences', function () {
    $response = $this->withHeaders(['Authorization' => "Bearer {$this->token}"])
        ->getJson('/api/gestionnaire/impayes')
        ->assertStatus(200)
        ->assertJsonPath('status', 'success');

    expect($response->json('data.count'))->toBe(1)
        ->and($response->json('data.total_impaye'))->toEqual(1000);
});

it('lists paiements', function () {
    Paiement::create([
        'tenant_id' => $this->tenant->id, 'coproprietaire_id' => $this->copro->id,
        'appel_fonds_ligne_id' => $this->ligne->id, 'saisi_par' => $this->gestionnaire->id,
        'montant' => 500, 'mode' => 'virement', 'date_paiement' => Carbon::today(),
    ]);

    $this->withHeaders(['Authorization' => "Bearer {$this->token}"])
        ->getJson('/api/gestionnaire/paiements')
        ->assertStatus(200)
        ->assertJsonPath('data.meta.total', 1);
});
