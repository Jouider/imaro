<?php

use App\Jobs\GenerateConvocationsJob;
use App\Models\Assemblee;
use App\Models\Convocation;
use App\Models\Coproprietaire;
use App\Models\Immeuble;
use App\Models\Lot;
use App\Models\Residence;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Facades\Storage;
use Spatie\Permission\Models\Role;

uses(RefreshDatabase::class);

beforeEach(function () {
    Queue::fake(); // comme en prod (redis) : le job ne tourne pas inline
    Role::firstOrCreate(['name' => 'manager', 'guard_name' => 'web']);

    $this->tenant = Tenant::create(['name' => 'Gest', 'email' => 't@t.ma', 'subdomain' => 't', 'plan' => 'business', 'status' => 'active']);
    config(['app.tenant_id' => $this->tenant->id]);
    $this->manager = User::create(['tenant_id' => $this->tenant->id, 'name' => 'Mgr', 'phone' => '+212600000001', 'role' => 'manager', 'status' => 'active']);
    $this->manager->assignRole('manager');

    $this->residence = Residence::withoutGlobalScope('tenant')->create(['tenant_id' => $this->tenant->id, 'gestionnaire_id' => $this->manager->id, 'name' => 'Aqualina', 'address' => 'Bd X', 'city' => 'Casa', 'total_tantieme' => 1000, 'nb_lots' => 1, 'status' => 'active', 'mode_cotisation' => 'tantieme']);
    $imm = Immeuble::withoutGlobalScope('tenant')->create(['tenant_id' => $this->tenant->id, 'residence_id' => $this->residence->id, 'nom' => 'A', 'nb_etages' => 1, 'nb_lots' => 1]);
    $lot = Lot::withoutGlobalScope('tenant')->create(['tenant_id' => $this->tenant->id, 'residence_id' => $this->residence->id, 'immeuble_id' => $imm->id, 'numero' => 'A1', 'type' => 'appartement', 'etage' => 1, 'tantieme' => 350]);
    $resident = User::create(['tenant_id' => $this->tenant->id, 'name' => 'Hassan Benali', 'phone' => '+212611111111', 'role' => 'resident', 'status' => 'active']);
    Coproprietaire::create(['tenant_id' => $this->tenant->id, 'user_id' => $resident->id, 'lot_id' => $lot->id, 'type' => 'proprietaire', 'solde_actuel' => 0]);

    $this->assemblee = Assemblee::create(['tenant_id' => $this->tenant->id, 'residence_id' => $this->residence->id, 'created_by' => $this->manager->id, 'titre' => 'AG 2026', 'type' => 'ordinaire', 'date' => '2026-07-15 10:00:00', 'lieu' => 'Salle commune', 'quorum_requis' => 50, 'ordre_du_jour' => "1. Comptes 2025\n2. Budget 2026", 'statut' => 'planifiee']);

    $this->auth = ['Authorization' => 'Bearer '.$this->manager->createToken('t')->plainTextToken];
});

it('POST convocations → 202 accepted + count, dispatch du Job, statut pending', function () {
    $this->withHeaders($this->auth)->postJson("/api/gestionnaire/assemblees/{$this->assemblee->id}/convocations")
        ->assertStatus(202)
        ->assertJsonPath('status', 'accepted')
        ->assertJsonPath('count', 1);

    Queue::assertPushed(GenerateConvocationsJob::class);
    expect($this->assemblee->fresh()->convocations_status)->toBe('pending');
});

it('POST count compte aussi les lots sans copro assigné ("Non assigné")', function () {
    // Régression : le count annoncé doit matcher ce que le Job génère réellement
    // (un lot par lot, copro assigné ou pas), pas seulement whereHas('coproprietairePrincipal').
    $imm = Immeuble::withoutGlobalScope('tenant')->first();
    Lot::withoutGlobalScope('tenant')->create([
        'tenant_id' => $this->tenant->id, 'residence_id' => $this->residence->id, 'immeuble_id' => $imm->id,
        'numero' => 'A2', 'type' => 'appartement', 'etage' => 1, 'tantieme' => 1,
    ]);

    $this->withHeaders($this->auth)->postJson("/api/gestionnaire/assemblees/{$this->assemblee->id}/convocations")
        ->assertStatus(202)
        ->assertJsonPath('count', 2);
});

it('le Job génère une convocation par copro + le PDF fusionné', function () {
    Storage::fake('public');

    (new GenerateConvocationsJob($this->assemblee->id))->handle();

    $convs = Convocation::where('assemblee_id', $this->assemblee->id)->get();
    expect($convs)->toHaveCount(1)
        ->and($convs[0]->coproprietaire_nom)->toBe('Hassan Benali')
        ->and($convs[0]->tantieme)->toBe(350);
    Storage::disk('public')->assertExists($convs[0]->pdf_path);

    $a = $this->assemblee->fresh();
    expect($a->convocations_status)->toBe('ready')
        ->and($a->convocations_merged_path)->not->toBeNull();
    Storage::disk('public')->assertExists($a->convocations_merged_path);
});

it('POST régénère : vide merged_url/generated_at de l\'ancienne génération (sinon GET montre du stale pendant "pending")', function () {
    Storage::fake('public');
    (new GenerateConvocationsJob($this->assemblee->id))->handle();
    expect($this->assemblee->fresh()->convocations_merged_path)->not->toBeNull();

    $this->withHeaders($this->auth)->postJson("/api/gestionnaire/assemblees/{$this->assemblee->id}/convocations")
        ->assertStatus(202);

    $a = $this->assemblee->fresh();
    expect($a->convocations_status)->toBe('pending')
        ->and($a->convocations_merged_path)->toBeNull()
        ->and($a->convocations_generated_at)->toBeNull();
});

it('GET convocations → ready + merged_url + liste', function () {
    Storage::fake('public');
    (new GenerateConvocationsJob($this->assemblee->id))->handle();

    $this->withHeaders($this->auth)->getJson("/api/gestionnaire/assemblees/{$this->assemblee->id}/convocations")
        ->assertStatus(200)
        ->assertJsonPath('status', 'ready')
        ->assertJsonPath('convocations.0.lot', 'A1')
        ->assertJsonPath('convocations.0.tantieme', 350)
        ->assertJsonStructure(['status', 'generated_at', 'merged_url', 'convocations' => [['id', 'coproprietaire_nom', 'lot', 'tantieme', 'url']]]);
});
