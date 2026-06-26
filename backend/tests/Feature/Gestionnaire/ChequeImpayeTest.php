<?php

/**
 * KAN-85 — marquer un chèque comme impayé (rejet bancaire).
 */

use App\Models\AppelFonds;
use App\Models\AppelFondsLigne;
use App\Models\Coproprietaire;
use App\Models\Exercice;
use App\Models\Immeuble;
use App\Models\Lot;
use App\Models\Notification;
use App\Models\Paiement;
use App\Models\Residence;
use App\Models\Tenant;
use App\Models\User;
use Carbon\Carbon;
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
    $this->resident = User::create(['tenant_id' => $this->tenant->id, 'name' => 'Hassan Benali', 'phone' => '+212611111111', 'role' => 'resident', 'status' => 'active']);
    $this->copro = Coproprietaire::create(['tenant_id' => $this->tenant->id, 'user_id' => $this->resident->id, 'lot_id' => $lot->id, 'type' => 'proprietaire', 'solde_actuel' => 0]);

    $this->ex = Exercice::withoutGlobalScope('tenant')->create(['tenant_id' => $this->tenant->id, 'residence_id' => $this->residence->id, 'annee' => 2026, 'date_debut' => '2026-01-01', 'date_fin' => '2026-12-31', 'statut' => 'actif']);

    $af = AppelFonds::withoutGlobalScope('tenant')->create([
        'tenant_id' => $this->tenant->id, 'residence_id' => $this->residence->id, 'created_by' => $this->manager->id,
        'libelle' => 'Charges Q2', 'montant_total' => 1000, 'date_echeance' => Carbon::now()->addMonth(), 'statut' => 'envoye', 'sent_at' => Carbon::now(),
    ]);
    // Chèque encaissé qui solde la ligne.
    $this->ligne = AppelFondsLigne::create(['appel_fonds_id' => $af->id, 'coproprietaire_id' => $this->copro->id, 'montant_du' => 1000, 'montant_paye' => 1000, 'statut' => 'paye']);
    $this->copro->recalculerSolde(); // solde = 0

    $this->paiement = Paiement::create([
        'tenant_id' => $this->tenant->id, 'exercice_id' => $this->ex->id, 'coproprietaire_id' => $this->copro->id,
        'appel_fonds_ligne_id' => $this->ligne->id, 'saisi_par' => $this->manager->id,
        'montant' => 1000, 'mode' => 'cheque', 'reference' => 'CHQ-77', 'date_paiement' => '2026-04-01',
    ]);

    $this->auth = ['Authorization' => 'Bearer '.$this->manager->createToken('t')->plainTextToken];
});

it('marque un chèque impayé → annule la ligne, régularise le solde, notifie', function () {
    expect((float) $this->copro->fresh()->solde_actuel)->toBe(0.0);

    $this->withHeaders($this->auth)
        ->postJson("/api/gestionnaire/paiements/{$this->paiement->id}/cheque-impaye", ['motif' => 'Provision insuffisante'])
        ->assertStatus(200)
        ->assertJsonPath('data.paiement.statut', 'cheque_rejete')
        ->assertJsonPath('data.paiement.motif_rejet', 'Provision insuffisante');

    // Paiement marqué + ligne revenue à impayé.
    expect($this->paiement->fresh()->statut)->toBe('cheque_rejete');
    $l = $this->ligne->fresh();
    expect($l->montant_paye)->toBe(0.0)->and($l->statut)->toBe('impaye');

    // Solde régularisé : le copro doit de nouveau 1000.
    expect((float) $this->copro->fresh()->solde_actuel)->toBe(-1000.0);

    // Notification au résident.
    expect(Notification::where('user_id', $this->resident->id)->where('title', 'Chèque rejeté')->exists())->toBeTrue();
});

it('apparaît dans le journal comptable (contre-passation « Chèque impayé »)', function () {
    $this->withHeaders($this->auth)->postJson("/api/gestionnaire/paiements/{$this->paiement->id}/cheque-impaye");

    $journal = $this->withHeaders($this->auth)
        ->getJson("/api/gestionnaire/comptabilite/exercices/{$this->ex->id}/journal")
        ->assertStatus(200)
        ->json('data');

    $descriptions = collect($journal)->pluck('description');
    expect($descriptions->contains(fn ($d) => str_contains($d, 'Chèque impayé')))->toBeTrue();
});

it('refuse (422) un paiement qui n\'est pas un chèque', function () {
    $this->paiement->update(['mode' => 'virement']);
    $this->withHeaders($this->auth)
        ->postJson("/api/gestionnaire/paiements/{$this->paiement->id}/cheque-impaye")
        ->assertStatus(422);
});

it('refuse (422) un chèque déjà marqué impayé', function () {
    $this->paiement->update(['statut' => 'cheque_rejete']);
    $this->withHeaders($this->auth)
        ->postJson("/api/gestionnaire/paiements/{$this->paiement->id}/cheque-impaye")
        ->assertStatus(422);
});
