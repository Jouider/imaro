<?php

use App\Models\BilanOuvertureLigne;
use App\Models\Exercice;
use App\Models\Residence;
use App\Models\Tenant;
use App\Models\User;
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
        'tenant_id' => $this->tenant->id, 'name' => 'Youssef Test',
        'phone' => '+212611000001', 'role' => 'gestionnaire', 'status' => 'active',
    ]);
    $this->gestionnaire->assignRole('gestionnaire');

    $this->residence = Residence::withoutGlobalScopes()->create([
        'tenant_id' => $this->tenant->id, 'gestionnaire_id' => $this->gestionnaire->id,
        'name' => 'Résidence Atlas', 'address' => 'Bd Zerktouni', 'city' => 'Casablanca',
        'total_tantieme' => 1000, 'nb_lots' => 0, 'status' => 'active',
    ]);

    $this->exercice = Exercice::withoutGlobalScopes()->create([
        'tenant_id' => $this->tenant->id, 'residence_id' => $this->residence->id,
        'annee' => 2026, 'date_debut' => '2026-01-01', 'date_fin' => '2026-12-31',
        'statut' => 'actif',
    ]);

    $this->token = $this->gestionnaire->createToken('test')->plainTextToken;
});

// ─── Bulk import ──────────────────────────────────────────────────────────────

it('imports bilan ouverture lignes in bulk', function () {
    $this->withHeaders(['Authorization' => "Bearer {$this->token}"])
        ->postJson("/api/gestionnaire/residences/{$this->residence->id}/bilan-ouverture/bulk", [
            'exercice_id' => $this->exercice->id,
            'lignes' => [
                ['numero_compte' => '512', 'libelle' => 'Banque', 'solde_debit' => 50000, 'solde_credit' => 0],
                ['numero_compte' => '401', 'libelle' => 'Fournisseurs', 'solde_debit' => 0, 'solde_credit' => 12000],
                ['numero_compte' => '115', 'libelle' => 'Report à nouveau', 'solde_debit' => 0, 'solde_credit' => 38000],
            ],
        ])
        ->assertStatus(201)
        ->assertJsonPath('status', 'success')
        ->assertJsonCount(3, 'data.lignes');

    expect(BilanOuvertureLigne::where('residence_id', $this->residence->id)->count())->toBe(3);
});

it('upserts existing lignes on re-import', function () {
    BilanOuvertureLigne::create([
        'tenant_id' => $this->tenant->id, 'residence_id' => $this->residence->id,
        'exercice_id' => $this->exercice->id, 'created_by' => $this->gestionnaire->id,
        'numero_compte' => '512', 'libelle' => 'Banque', 'solde_debit' => 30000, 'solde_credit' => 0,
    ]);

    $this->withHeaders(['Authorization' => "Bearer {$this->token}"])
        ->postJson("/api/gestionnaire/residences/{$this->residence->id}/bilan-ouverture/bulk", [
            'exercice_id' => $this->exercice->id,
            'lignes' => [
                ['numero_compte' => '512', 'libelle' => 'Banque (MAJ)', 'solde_debit' => 75000, 'solde_credit' => 0],
            ],
        ])
        ->assertStatus(201);

    $ligne = BilanOuvertureLigne::where('residence_id', $this->residence->id)
        ->where('numero_compte', '512')->first();

    expect($ligne->solde_debit)->toBe(75000.0)
        ->and($ligne->libelle)->toBe('Banque (MAJ)');
    expect(BilanOuvertureLigne::where('residence_id', $this->residence->id)->count())->toBe(1);
});

it('rejects comptes starting with 6 or 7 (P&L, not bilan)', function () {
    $this->withHeaders(['Authorization' => "Bearer {$this->token}"])
        ->postJson("/api/gestionnaire/residences/{$this->residence->id}/bilan-ouverture/bulk", [
            'exercice_id' => $this->exercice->id,
            'lignes' => [
                ['numero_compte' => '612', 'libelle' => 'Eau', 'solde_debit' => 5000, 'solde_credit' => 0],
            ],
        ])
        ->assertStatus(422);
});

it('rejects lignes with both debit and credit non-zero', function () {
    $this->withHeaders(['Authorization' => "Bearer {$this->token}"])
        ->postJson("/api/gestionnaire/residences/{$this->residence->id}/bilan-ouverture/bulk", [
            'exercice_id' => $this->exercice->id,
            'lignes' => [
                ['numero_compte' => '512', 'libelle' => 'Banque', 'solde_debit' => 5000, 'solde_credit' => 3000],
            ],
        ])
        ->assertStatus(422);
});

it('rejects lignes with both debit and credit zero', function () {
    $this->withHeaders(['Authorization' => "Bearer {$this->token}"])
        ->postJson("/api/gestionnaire/residences/{$this->residence->id}/bilan-ouverture/bulk", [
            'exercice_id' => $this->exercice->id,
            'lignes' => [
                ['numero_compte' => '512', 'libelle' => 'Banque', 'solde_debit' => 0, 'solde_credit' => 0],
            ],
        ])
        ->assertStatus(422);
});

it('rejects import on a closed exercice', function () {
    $this->exercice->update(['statut' => 'cloture']);

    $this->withHeaders(['Authorization' => "Bearer {$this->token}"])
        ->postJson("/api/gestionnaire/residences/{$this->residence->id}/bilan-ouverture/bulk", [
            'exercice_id' => $this->exercice->id,
            'lignes' => [
                ['numero_compte' => '512', 'libelle' => 'Banque', 'solde_debit' => 10000, 'solde_credit' => 0],
            ],
        ])
        ->assertStatus(422);
});

// ─── Index ────────────────────────────────────────────────────────────────────

it('lists bilan ouverture lignes filtered by exercice', function () {
    BilanOuvertureLigne::create([
        'tenant_id' => $this->tenant->id, 'residence_id' => $this->residence->id,
        'exercice_id' => $this->exercice->id, 'created_by' => $this->gestionnaire->id,
        'numero_compte' => '512', 'libelle' => 'Banque', 'solde_debit' => 50000, 'solde_credit' => 0,
    ]);

    $this->withHeaders(['Authorization' => "Bearer {$this->token}"])
        ->getJson("/api/gestionnaire/residences/{$this->residence->id}/bilan-ouverture?exercice_id={$this->exercice->id}")
        ->assertStatus(200)
        ->assertJsonCount(1, 'data.lignes')
        ->assertJsonPath('data.lignes.0.numero_compte', '512');
});
