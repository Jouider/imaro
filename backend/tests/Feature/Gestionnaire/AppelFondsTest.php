<?php

use App\Models\AppelFonds;
use App\Models\AppelFondsLigne;
use App\Models\Coproprietaire;
use App\Models\Lot;
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
        'name' => 'Résidence Test', 'address' => 'Rue A', 'city' => 'Casablanca',
        'total_tantieme' => 1000, 'nb_lots' => 2, 'status' => 'active',
    ]);

    // 2 lots avec copropriétaires
    $resident1 = User::create(['tenant_id' => $this->tenant->id, 'name' => 'Hassan Benali', 'phone' => '+212611000010', 'role' => 'resident', 'status' => 'active']);
    $resident2 = User::create(['tenant_id' => $this->tenant->id, 'name' => 'Fatima Chraibi', 'phone' => '+212611000011', 'role' => 'resident', 'status' => 'active']);

    $lot1 = Lot::create(['tenant_id' => $this->tenant->id, 'residence_id' => $this->residence->id, 'numero' => 'A01', 'type' => 'appartement', 'etage' => 1, 'tantieme' => 600]);
    $lot2 = Lot::create(['tenant_id' => $this->tenant->id, 'residence_id' => $this->residence->id, 'numero' => 'A02', 'type' => 'appartement', 'etage' => 2, 'tantieme' => 400]);

    $this->copro1 = Coproprietaire::create(['tenant_id' => $this->tenant->id, 'user_id' => $resident1->id, 'lot_id' => $lot1->id, 'type' => 'proprietaire', 'solde_actuel' => 0]);
    $this->copro2 = Coproprietaire::create(['tenant_id' => $this->tenant->id, 'user_id' => $resident2->id, 'lot_id' => $lot2->id, 'type' => 'proprietaire', 'solde_actuel' => 0]);

    $this->token = $this->gestionnaire->createToken('test')->plainTextToken;
});

// ─── Appels de fonds ─────────────────────────────────────────────────────────

it('creates an appel de fonds and generates lines by tantieme', function () {
    $response = $this->withHeaders(['Authorization' => "Bearer {$this->token}"])
        ->postJson('/api/gestionnaire/appels-fonds', [
            'libelle'       => 'Charges Q2 2026',
            'residence_id'  => $this->residence->id,
            'montant_total' => 10000,
            'date_echeance' => Carbon::now()->addMonths(2)->toDateString(),
        ])
        ->assertStatus(201)
        ->assertJsonPath('status', 'success');

    $af = AppelFonds::withoutGlobalScopes()->first();
    expect($af)->not->toBeNull()
        ->and($af->statut)->toBe('brouillon');

    $lignes = AppelFondsLigne::where('appel_fonds_id', $af->id)->get();
    expect($lignes)->toHaveCount(2);

    // Tantième A01 = 600/1000 → 6000 DH
    $ligne1 = $lignes->firstWhere('coproprietaire_id', $this->copro1->id);
    expect($ligne1->montant_du)->toBe(6000.0);

    // Tantième A02 = 400/1000 → 4000 DH
    $ligne2 = $lignes->firstWhere('coproprietaire_id', $this->copro2->id);
    expect($ligne2->montant_du)->toBe(4000.0);
});

it('lists appels de fonds for gestionnaire residences only', function () {
    AppelFonds::withoutGlobalScopes()->create([
        'tenant_id' => $this->tenant->id, 'residence_id' => $this->residence->id,
        'created_by' => $this->gestionnaire->id, 'libelle' => 'Test AF',
        'montant_total' => 5000, 'date_echeance' => Carbon::now()->addMonth(),
        'statut' => 'brouillon',
    ]);

    $this->withHeaders(['Authorization' => "Bearer {$this->token}"])
        ->getJson('/api/gestionnaire/appels-fonds')
        ->assertStatus(200)
        ->assertJsonPath('data.meta.total', 1);
});

it('shows appel de fonds detail with lines', function () {
    $af = AppelFonds::withoutGlobalScopes()->create([
        'tenant_id' => $this->tenant->id, 'residence_id' => $this->residence->id,
        'created_by' => $this->gestionnaire->id, 'libelle' => 'Charges Q3',
        'montant_total' => 8000, 'date_echeance' => Carbon::now()->addMonth(),
        'statut' => 'brouillon',
    ]);
    $af->genererLignes();

    $this->withHeaders(['Authorization' => "Bearer {$this->token}"])
        ->getJson("/api/gestionnaire/appels-fonds/{$af->id}")
        ->assertStatus(200)
        ->assertJsonPath('data.appel_fonds.libelle', 'Charges Q3');
});

it('updates an appel de fonds in brouillon status', function () {
    $af = AppelFonds::withoutGlobalScopes()->create([
        'tenant_id' => $this->tenant->id, 'residence_id' => $this->residence->id,
        'created_by' => $this->gestionnaire->id, 'libelle' => 'Old Label',
        'montant_total' => 5000, 'date_echeance' => Carbon::now()->addMonth(),
        'statut' => 'brouillon',
    ]);

    $this->withHeaders(['Authorization' => "Bearer {$this->token}"])
        ->putJson("/api/gestionnaire/appels-fonds/{$af->id}", ['libelle' => 'New Label'])
        ->assertStatus(200)
        ->assertJsonPath('data.appel_fonds.libelle', 'New Label');
});

it('rejects update when appel de fonds is already sent', function () {
    $af = AppelFonds::withoutGlobalScopes()->create([
        'tenant_id' => $this->tenant->id, 'residence_id' => $this->residence->id,
        'created_by' => $this->gestionnaire->id, 'libelle' => 'AF Envoyé',
        'montant_total' => 5000, 'date_echeance' => Carbon::now()->addMonth(),
        'statut' => 'envoye',
    ]);

    $this->withHeaders(['Authorization' => "Bearer {$this->token}"])
        ->putJson("/api/gestionnaire/appels-fonds/{$af->id}", ['libelle' => 'Hack'])
        ->assertStatus(422);
});

it('sends appel de fonds and changes status to envoye', function () {
    $af = AppelFonds::withoutGlobalScopes()->create([
        'tenant_id' => $this->tenant->id, 'residence_id' => $this->residence->id,
        'created_by' => $this->gestionnaire->id, 'libelle' => 'AF à envoyer',
        'montant_total' => 5000, 'date_echeance' => Carbon::now()->addMonth(),
        'statut' => 'brouillon',
    ]);
    $af->genererLignes();

    $this->withHeaders(['Authorization' => "Bearer {$this->token}"])
        ->postJson("/api/gestionnaire/appels-fonds/{$af->id}/envoyer")
        ->assertStatus(200)
        ->assertJsonPath('data.appel_fonds.statut', 'envoye');

    expect($af->fresh()->sent_at)->not->toBeNull();
});
