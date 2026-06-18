<?php

use App\Models\Coproprietaire;
use App\Models\Exercice;
use App\Models\Immeuble;
use App\Models\Lot;
use App\Models\Paiement;
use App\Models\Residence;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Role;

uses(RefreshDatabase::class);

it('la balance renvoie numero en chaîne (sort localeCompare côté front)', function () {
    foreach (['manager', 'resident'] as $r) {
        Role::firstOrCreate(['name' => $r, 'guard_name' => 'web']);
    }

    $tenant = Tenant::create(['name' => 'T', 'email' => 't@t.ma', 'subdomain' => 't', 'plan' => 'business', 'status' => 'active']);
    config(['app.tenant_id' => $tenant->id]);

    $manager = User::create(['tenant_id' => $tenant->id, 'name' => 'Mgr', 'phone' => '+212600000001', 'role' => 'manager', 'status' => 'active']);
    $manager->assignRole('manager');

    $residence = Residence::withoutGlobalScope('tenant')->create([
        'tenant_id' => $tenant->id, 'gestionnaire_id' => $manager->id, 'name' => 'Aqualina',
        'address' => 'X', 'city' => 'Casa', 'total_tantieme' => 1000, 'nb_lots' => 1, 'status' => 'active', 'mode_cotisation' => 'tantieme',
    ]);
    $imm = Immeuble::withoutGlobalScope('tenant')->create(['tenant_id' => $tenant->id, 'residence_id' => $residence->id, 'nom' => 'A', 'nb_etages' => 1, 'nb_lots' => 1]);
    $lot = Lot::withoutGlobalScope('tenant')->create(['tenant_id' => $tenant->id, 'residence_id' => $residence->id, 'immeuble_id' => $imm->id, 'numero' => 'A1', 'type' => 'appartement', 'etage' => 1, 'tantieme' => 1000]);
    $resident = User::create(['tenant_id' => $tenant->id, 'name' => 'Hassan', 'phone' => '+212611111111', 'role' => 'resident', 'status' => 'active']);
    $copro = Coproprietaire::create(['tenant_id' => $tenant->id, 'user_id' => $resident->id, 'lot_id' => $lot->id, 'type' => 'proprietaire', 'solde_actuel' => 0]);

    $ex = Exercice::withoutGlobalScope('tenant')->create(['tenant_id' => $tenant->id, 'residence_id' => $residence->id, 'annee' => 2026, 'date_debut' => '2026-01-01', 'date_fin' => '2026-12-31', 'statut' => 'actif']);
    Paiement::create(['tenant_id' => $tenant->id, 'exercice_id' => $ex->id, 'coproprietaire_id' => $copro->id, 'saisi_par' => $manager->id, 'montant' => 600, 'mode' => 'virement', 'date_paiement' => '2026-04-01']);

    $auth = ['Authorization' => 'Bearer '.$manager->createToken('t')->plainTextToken];

    $res = $this->withHeaders($auth)
        ->getJson("/api/gestionnaire/comptabilite/exercices/{$ex->id}/balance")
        ->assertStatus(200);

    $rows = $res->json('data');
    expect($rows)->not->toBeEmpty();
    foreach ($rows as $row) {
        expect($row['numero'])->toBeString();
    }
});
