<?php

/**
 * Champs obligatoires (quick wins conformité saisie) :
 *  - KAN-83 : référence obligatoire à la déclaration de paiement (portail résident).
 *  - KAN-92 : CIN obligatoire pour les utilisateurs d'équipe et le personnel.
 *  - KAN-94 : titre foncier obligatoire sur les lots (création + import bulk).
 */

use App\Contracts\Notifications\NotificationResult;
use App\Models\Coproprietaire;
use App\Models\Immeuble;
use App\Models\Lot;
use App\Models\Residence;
use App\Models\Tenant;
use App\Models\User;
use App\Services\Notifications\CoproprietaireWelcomeNotifier;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Queue;
use Spatie\Permission\Models\Role;

uses(RefreshDatabase::class);

beforeEach(function () {
    Queue::fake();
    foreach (['manager', 'gestionnaire', 'resident', 'personnel'] as $r) {
        Role::firstOrCreate(['name' => $r, 'guard_name' => 'web']);
    }

    $this->tenant = Tenant::create(['name' => 'T', 'email' => 't@t.ma', 'subdomain' => 't', 'plan' => 'business', 'status' => 'active']);
    config(['app.tenant_id' => $this->tenant->id]);

    $this->manager = User::create(['tenant_id' => $this->tenant->id, 'name' => 'Fikri', 'phone' => '+212600000001', 'email' => 'm@t.ma', 'role' => 'manager', 'status' => 'active']);
    $this->manager->assignRole('manager');

    $this->residence = Residence::withoutGlobalScope('tenant')->create([
        'tenant_id' => $this->tenant->id, 'gestionnaire_id' => $this->manager->id, 'name' => 'Atlas',
        'address' => 'X', 'city' => 'Casa', 'total_tantieme' => 1000, 'nb_lots' => 0, 'status' => 'active', 'mode_cotisation' => 'tantieme',
    ]);
    $this->immeuble = Immeuble::withoutGlobalScope('tenant')->create(['tenant_id' => $this->tenant->id, 'residence_id' => $this->residence->id, 'nom' => 'A', 'nb_etages' => 5, 'nb_lots' => 0]);

    $this->auth = ['Authorization' => 'Bearer '.$this->manager->createToken('t')->plainTextToken];
});

// ── KAN-94 / KAN-150 : titre foncier facultatif à la création ────────────────
//
// KAN-94 l'avait rendu obligatoire, ce qui bloquait la génération de lots
// (KAN-150) : on ne connaît pas les références foncières au moment de créer la
// structure d'une résidence. Il se renseigne lot par lot ensuite.

it('KAN-150 — crée un lot SANS titre foncier (facultatif)', function () {
    $this->withHeaders($this->auth)
        ->postJson("/api/gestionnaire/residences/{$this->residence->id}/lots", [
            'numero' => 'A01', 'type' => 'appartement', 'etage' => 1, 'tantieme' => 100,
            'immeuble_id' => $this->immeuble->id,
        ])
        ->assertStatus(201)
        ->assertJsonPath('data.lot.titre_foncier', null);
});

it('KAN-94 — crée un lot avec titre foncier et le renvoie dans la liste', function () {
    $this->withHeaders($this->auth)
        ->postJson("/api/gestionnaire/residences/{$this->residence->id}/lots", [
            'numero' => 'A01', 'titre_foncier' => 'TF-12345/C', 'type' => 'appartement',
            'etage' => 1, 'tantieme' => 100, 'immeuble_id' => $this->immeuble->id,
        ])
        ->assertStatus(201)
        ->assertJsonPath('data.lot.titre_foncier', 'TF-12345/C');

    $this->withHeaders($this->auth)
        ->getJson("/api/gestionnaire/residences/{$this->residence->id}/lots")
        ->assertStatus(200)
        ->assertJsonPath('data.lots.0.titre_foncier', 'TF-12345/C');
});

it('KAN-150 — génère en masse SANS titre foncier', function () {
    $res = $this->withHeaders($this->auth)
        ->postJson("/api/gestionnaire/residences/{$this->residence->id}/lots/bulk", [
            'lots' => [['numero' => 'A01', 'type' => 'appartement', 'etage' => 1, 'tantieme' => 100]],
        ])
        ->assertStatus(200);

    expect($res->json('data.created'))->toBe(1);
    expect($res->json('data.errors'))->toBe([]);
});

// ── KAN-92 : CIN obligatoire (utilisateurs d'équipe + personnel) ─────────────

it('KAN-92 — rejette (422) la création d\'un utilisateur d\'équipe sans CIN', function () {
    $this->withHeaders($this->auth)->postJson('/api/equipe/utilisateurs', [
        'name' => 'Salma', 'email' => 'salma@t.ma', 'password' => 'secret123', 'role' => 'assistant',
    ])
        ->assertStatus(422)
        ->assertJsonValidationErrors('cin');
});

it('KAN-92 — crée un utilisateur d\'équipe avec CIN et le renvoie', function () {
    $this->withHeaders($this->auth)->postJson('/api/equipe/utilisateurs', [
        'name' => 'Salma', 'cin' => 'BK998877', 'email' => 'salma@t.ma', 'password' => 'secret123', 'role' => 'assistant',
    ])
        ->assertStatus(201)
        ->assertJsonPath('data.cin', 'BK998877');

    expect(User::where('email', 'salma@t.ma')->first()->cin)->toBe('BK998877');
});

it('KAN-92 — rejette (422) la création d\'un personnel sans CIN', function () {
    $this->withHeaders($this->auth)->postJson('/api/gestionnaire/equipe/personnel', [
        'name' => 'Ahmed', 'poste' => 'gardien', 'residence_id' => $this->residence->id, 'phone' => '+212611223344',
    ])
        ->assertStatus(422)
        ->assertJsonValidationErrors('cin');
});

it('KAN-92 — crée un personnel avec CIN (sur le compte + la fiche)', function () {
    $this->mock(CoproprietaireWelcomeNotifier::class)
        ->shouldReceive('send')->once()
        ->andReturn(NotificationResult::ok('sms8'));

    $this->withHeaders($this->auth)->postJson('/api/gestionnaire/equipe/personnel', [
        'name' => 'Ahmed', 'cin' => 'JC112233', 'poste' => 'gardien',
        'residence_id' => $this->residence->id, 'phone' => '+212611223344',
    ])
        ->assertStatus(201)
        ->assertJsonPath('data.cin', 'JC112233');

    expect(User::where('phone', '+212611223344')->first()->cin)->toBe('JC112233');
});

// ── KAN-83 : référence obligatoire à la déclaration de paiement ──────────────

it('KAN-83 — rejette (422) une déclaration de paiement sans référence', function () {
    $resident = User::create(['tenant_id' => $this->tenant->id, 'name' => 'Hassan', 'phone' => '+212611111111', 'role' => 'resident', 'status' => 'active', 'password' => bcrypt('x')]);
    $resident->assignRole('resident');
    $lot = Lot::withoutGlobalScope('tenant')->create(['tenant_id' => $this->tenant->id, 'residence_id' => $this->residence->id, 'immeuble_id' => $this->immeuble->id, 'numero' => 'A1', 'type' => 'appartement', 'etage' => 1, 'tantieme' => 100, 'titre_foncier' => 'TF-1']);
    Coproprietaire::create(['tenant_id' => $this->tenant->id, 'user_id' => $resident->id, 'lot_id' => $lot->id, 'type' => 'proprietaire', 'solde_actuel' => 0]);

    $resAuth = ['Authorization' => 'Bearer '.$resident->createToken('t')->plainTextToken];

    $this->withHeaders($resAuth)->postJson('/api/portail/paiements', [
        'montant' => 1500, 'date' => '2026-06-10', 'methode' => 'virement',
    ])
        ->assertStatus(422)
        ->assertJsonValidationErrors('reference');
});
