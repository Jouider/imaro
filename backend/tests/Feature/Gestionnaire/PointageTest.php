<?php

use App\Models\AppelFonds;
use App\Models\AppelFondsLigne;
use App\Models\Coproprietaire;
use App\Models\Depense;
use App\Models\Exercice;
use App\Models\Paiement;
use App\Models\PointageLineMatch;
use App\Models\PointageSession;
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
    $this->headers = ['Authorization' => "Bearer {$this->token}"];
});

// ─── Create session ───────────────────────────────────────────────────────────

it('creates a pointage session from JSON lines (demo mode)', function () {
    $this->withHeaders($this->headers)
        ->postJson("/api/gestionnaire/residences/{$this->residence->id}/pointage/sessions", [
            'banque' => 'attijariwafa',
            'lines' => [
                ['date' => '2026-04-01', 'libelle' => 'Virement Fatima Idrissi', 'debit' => 0, 'credit' => 900],
                ['date' => '2026-04-03', 'libelle' => 'Prélèvement Lydec', 'debit' => 1200, 'credit' => 0],
                ['date' => '2026-04-05', 'libelle' => 'Frais bancaires', 'debit' => 65, 'credit' => 0],
            ],
        ])
        ->assertStatus(201)
        ->assertJsonPath('data.totalLines', 3)
        ->assertJsonPath('data.totalCredit', 900)
        ->assertJsonPath('data.totalDebit', 1265);

    expect(PointageSession::where('residence_id', $this->residence->id)->count())->toBe(1);
});

it('creates a pointage session from CSV file', function () {
    $csv = "Date;Libellé;Débit;Crédit\n" .
           "01/04/2026;Virement Hassan Benali;;1 800,00\n" .
           "03/04/2026;Paiement Lydec;1 200,50;\n" .
           "05/04/2026;Frais ATTIJARIWAFA;65,00;\n";

    $tmpFile = tmpfile();
    fwrite($tmpFile, $csv);
    $tmpPath = stream_get_meta_data($tmpFile)['uri'];

    $response = $this->withHeaders($this->headers)
        ->postJson("/api/gestionnaire/residences/{$this->residence->id}/pointage/sessions", [
            'banque' => 'attijariwafa',
            'file' => new \Illuminate\Http\UploadedFile($tmpPath, 'releve.csv', 'text/csv', null, true),
        ])
        ->assertStatus(201);

    expect($response->json('data.totalLines'))->toBe(3)
        ->and($response->json('data.totalCredit'))->toBe(1800)
        ->and($response->json('data.totalDebit'))->toBe(1265.5);

    fclose($tmpFile);
});

// ─── Candidates ───────────────────────────────────────────────────────────────

it('returns candidates (paiements + depenses) for matching', function () {
    // Create a depense
    Depense::create([
        'tenant_id' => $this->tenant->id, 'exercice_id' => $this->exercice->id,
        'residence_id' => $this->residence->id, 'created_by' => $this->gestionnaire->id,
        'description' => 'Lydec mars', 'categorie' => 'Eau/Électricité',
        'montant' => 1200, 'date' => '2026-03-15', 'statut' => 'paye',
    ]);

    $session = PointageSession::create([
        'tenant_id' => $this->tenant->id, 'residence_id' => $this->residence->id,
        'created_by' => $this->gestionnaire->id, 'banque' => 'cih',
        'totals' => ['total_lines' => 1], 'lines' => [['hash' => 'abc', 'date' => '2026-03-15', 'libelle' => 'Lydec', 'debit' => 1200, 'credit' => 0]],
    ]);

    $response = $this->withHeaders($this->headers)
        ->getJson("/api/gestionnaire/residences/{$this->residence->id}/pointage/sessions/{$session->id}/candidates")
        ->assertStatus(200)
        ->assertJsonStructure(['data' => ['candidates']]);

    $candidates = $response->json('data.candidates');
    $depenses = collect($candidates)->where('type', 'depense');
    expect($depenses)->toHaveCount(1)
        ->and($depenses->first()['montant'])->toBe(1200);
});

// ─── Confirm matches ──────────────────────────────────────────────────────────

it('confirms matches between bank lines and targets', function () {
    $depense = Depense::create([
        'tenant_id' => $this->tenant->id, 'exercice_id' => $this->exercice->id,
        'residence_id' => $this->residence->id, 'created_by' => $this->gestionnaire->id,
        'description' => 'Clean Pro', 'categorie' => 'Nettoyage',
        'montant' => 800, 'date' => '2026-04-10', 'statut' => 'paye',
    ]);

    $session = PointageSession::create([
        'tenant_id' => $this->tenant->id, 'residence_id' => $this->residence->id,
        'created_by' => $this->gestionnaire->id, 'banque' => 'attijariwafa',
        'totals' => ['total_lines' => 1],
        'lines' => [['hash' => 'line-hash-001', 'date' => '2026-04-10', 'libelle' => 'Paiement Clean Pro', 'debit' => 800, 'credit' => 0]],
    ]);

    $this->withHeaders($this->headers)
        ->postJson("/api/gestionnaire/residences/{$this->residence->id}/pointage/sessions/{$session->id}/matches/confirm", [
            'matches' => [
                ['bankLineId' => 'line-hash-001', 'targetType' => 'depense', 'targetId' => $depense->id],
            ],
        ])
        ->assertStatus(200)
        ->assertJsonPath('data.confirmed_count', 1);

    $match = PointageLineMatch::where('session_id', $session->id)->first();
    expect($match->target_type)->toBe('depense')
        ->and($match->target_id)->toBe($depense->id)
        ->and($match->confirmed_at)->not->toBeNull();
});

it('rejects confirm with invalid target type', function () {
    $session = PointageSession::create([
        'tenant_id' => $this->tenant->id, 'residence_id' => $this->residence->id,
        'created_by' => $this->gestionnaire->id, 'banque' => 'cih',
        'totals' => [], 'lines' => [],
    ]);

    $this->withHeaders($this->headers)
        ->postJson("/api/gestionnaire/residences/{$this->residence->id}/pointage/sessions/{$session->id}/matches/confirm", [
            'matches' => [
                ['bankLineId' => 'x', 'targetType' => 'invalid', 'targetId' => 1],
            ],
        ])
        ->assertStatus(422);
});

it('prevents confirming matches for a session from another residence', function () {
    $otherResidence = Residence::withoutGlobalScopes()->create([
        'tenant_id' => $this->tenant->id, 'gestionnaire_id' => $this->gestionnaire->id,
        'name' => 'Autre Résidence', 'address' => 'Rue X', 'city' => 'Rabat',
        'total_tantieme' => 1000, 'nb_lots' => 0, 'status' => 'active',
    ]);

    $session = PointageSession::create([
        'tenant_id' => $this->tenant->id, 'residence_id' => $otherResidence->id,
        'created_by' => $this->gestionnaire->id, 'banque' => 'cih',
        'totals' => [], 'lines' => [],
    ]);

    $this->withHeaders($this->headers)
        ->getJson("/api/gestionnaire/residences/{$this->residence->id}/pointage/sessions/{$session->id}/candidates")
        ->assertStatus(404);
});

it('requires authentication', function () {
    $this->postJson("/api/gestionnaire/residences/{$this->residence->id}/pointage/sessions", [
        'banque' => 'cih', 'lines' => [],
    ])->assertStatus(401);
});
