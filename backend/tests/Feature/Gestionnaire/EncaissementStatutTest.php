<?php

use App\Models\Coproprietaire;
use App\Models\Immeuble;
use App\Models\Lot;
use App\Models\Paiement;
use App\Models\Residence;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Role;

uses(RefreshDatabase::class);

beforeEach(function () {
    Role::firstOrCreate(['name' => 'manager', 'guard_name' => 'web']);

    $this->tenant = Tenant::create(['name' => 'T', 'email' => 't@t.ma', 'subdomain' => 't', 'plan' => 'business', 'status' => 'active']);
    config(['app.tenant_id' => $this->tenant->id]);
    $this->manager = User::create(['tenant_id' => $this->tenant->id, 'name' => 'Mgr', 'phone' => '+212600000001', 'role' => 'manager', 'status' => 'active']);
    $this->manager->assignRole('manager');
    $residence = Residence::withoutGlobalScope('tenant')->create(['tenant_id' => $this->tenant->id, 'gestionnaire_id' => $this->manager->id, 'name' => 'Atlas', 'address' => 'X', 'city' => 'Casa', 'total_tantieme' => 1000, 'nb_lots' => 1, 'status' => 'active', 'mode_cotisation' => 'tantieme']);
    $imm = Immeuble::withoutGlobalScope('tenant')->create(['tenant_id' => $this->tenant->id, 'residence_id' => $residence->id, 'nom' => 'A', 'nb_etages' => 1, 'nb_lots' => 1]);
    $lot = Lot::withoutGlobalScope('tenant')->create(['tenant_id' => $this->tenant->id, 'residence_id' => $residence->id, 'immeuble_id' => $imm->id, 'numero' => 'A1', 'type' => 'appartement', 'etage' => 1, 'tantieme' => 1000]);
    $resident = User::create(['tenant_id' => $this->tenant->id, 'name' => 'Hassan', 'phone' => '+212611111111', 'role' => 'resident', 'status' => 'active']);
    $this->copro = Coproprietaire::create(['tenant_id' => $this->tenant->id, 'user_id' => $resident->id, 'lot_id' => $lot->id, 'type' => 'proprietaire', 'solde_actuel' => 0]);

    $this->auth = ['Authorization' => 'Bearer '.$this->manager->createToken('t')->plainTextToken];
});

it('GET encaissements expose statut / cheque_rejete_at / motif_rejet (KAN-85 / #338)', function () {
    Paiement::create([
        'tenant_id' => $this->tenant->id, 'coproprietaire_id' => $this->copro->id, 'saisi_par' => $this->manager->id,
        'montant' => 1500, 'date_paiement' => '2026-06-10', 'mode' => 'cheque', 'reference' => 'CHQ-77',
        'statut' => 'cheque_rejete', 'cheque_rejete_at' => now(), 'motif_rejet' => 'Provision insuffisante',
    ]);

    $this->withHeaders($this->auth)->getJson('/api/gestionnaire/encaissements')
        ->assertStatus(200)
        ->assertJsonPath('data.0.statut', 'cheque_rejete')
        ->assertJsonPath('data.0.motif_rejet', 'Provision insuffisante')
        ->assertJsonPath('data.0.cheque_rejete_at', fn ($v) => is_string($v) && $v !== '');
});

it('un paiement normal renvoie statut « valide » par défaut', function () {
    Paiement::create([
        'tenant_id' => $this->tenant->id, 'coproprietaire_id' => $this->copro->id, 'saisi_par' => $this->manager->id,
        'montant' => 800, 'date_paiement' => '2026-06-11', 'mode' => 'virement', 'reference' => 'VIR-1',
    ]);

    $this->withHeaders($this->auth)->getJson('/api/gestionnaire/encaissements')
        ->assertStatus(200)
        ->assertJsonPath('data.0.statut', 'valide')
        ->assertJsonPath('data.0.motif_rejet', null);
});
