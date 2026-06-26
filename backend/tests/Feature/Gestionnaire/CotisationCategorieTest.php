<?php

/**
 * KAN-93 / KAN-108 — mode de cotisation « par catégorie » : catégories de lot
 * (nom + cotisation) par résidence, appliquées aux appels de fonds.
 */

use App\Models\AppelFonds;
use App\Models\CategorieLot;
use App\Models\Coproprietaire;
use App\Models\Immeuble;
use App\Models\Lot;
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
        'tenant_id' => $this->tenant->id, 'gestionnaire_id' => $this->manager->id, 'name' => 'Atlas',
        'address' => 'X', 'city' => 'Casa', 'total_tantieme' => 1000, 'nb_lots' => 0, 'status' => 'active', 'mode_cotisation' => 'categorie',
    ]);
    $this->imm = Immeuble::withoutGlobalScope('tenant')->create(['tenant_id' => $this->tenant->id, 'residence_id' => $this->residence->id, 'nom' => 'A', 'nb_etages' => 1, 'nb_lots' => 0]);

    $this->auth = ['Authorization' => 'Bearer '.$this->manager->createToken('t')->plainTextToken];
});

it('crée, liste, modifie et supprime une catégorie de lot', function () {
    $res = $this->withHeaders($this->auth)
        ->postJson("/api/gestionnaire/residences/{$this->residence->id}/categories-lot", ['nom' => 'Studio', 'cotisation' => 500])
        ->assertStatus(201)
        ->assertJsonPath('data.nom', 'Studio')
        ->assertJsonPath('data.cotisation', 500);
    $id = $res->json('data.id');

    $this->withHeaders($this->auth)->getJson("/api/gestionnaire/residences/{$this->residence->id}/categories-lot")
        ->assertStatus(200)->assertJsonPath('data.0.nom', 'Studio');

    $this->withHeaders($this->auth)->putJson("/api/gestionnaire/categories-lot/{$id}", ['cotisation' => 650])
        ->assertStatus(200)->assertJsonPath('data.cotisation', 650);

    $this->withHeaders($this->auth)->deleteJson("/api/gestionnaire/categories-lot/{$id}")->assertStatus(200);
    expect(CategorieLot::find($id))->toBeNull();
});

it('refuse (422) deux catégories de même nom dans une résidence', function () {
    CategorieLot::create(['tenant_id' => $this->tenant->id, 'residence_id' => $this->residence->id, 'nom' => 'Studio', 'cotisation' => 500]);
    $this->withHeaders($this->auth)
        ->postJson("/api/gestionnaire/residences/{$this->residence->id}/categories-lot", ['nom' => 'Studio', 'cotisation' => 600])
        ->assertStatus(422)->assertJsonValidationErrors('nom');
});

it('rattache une catégorie à un lot (création) et l\'expose', function () {
    $cat = CategorieLot::create(['tenant_id' => $this->tenant->id, 'residence_id' => $this->residence->id, 'nom' => 'F3', 'cotisation' => 800]);

    $this->withHeaders($this->auth)
        ->postJson("/api/gestionnaire/residences/{$this->residence->id}/lots", [
            'numero' => 'A1', 'titre_foncier' => 'TF/1', 'type' => 'appartement', 'etage' => 1,
            'tantieme' => 100, 'immeuble_id' => $this->imm->id, 'categorie_lot_id' => $cat->id,
        ])
        ->assertStatus(201)
        ->assertJsonPath('data.lot.categorie_lot_id', $cat->id);
});

it('refuse une catégorie d\'une autre résidence sur un lot', function () {
    $autre = Residence::withoutGlobalScope('tenant')->create(['tenant_id' => $this->tenant->id, 'gestionnaire_id' => $this->manager->id, 'name' => 'B', 'address' => 'Y', 'city' => 'Casa', 'total_tantieme' => 1000, 'nb_lots' => 0, 'status' => 'active', 'mode_cotisation' => 'categorie']);
    $catAutre = CategorieLot::create(['tenant_id' => $this->tenant->id, 'residence_id' => $autre->id, 'nom' => 'X', 'cotisation' => 100]);

    $this->withHeaders($this->auth)
        ->postJson("/api/gestionnaire/residences/{$this->residence->id}/lots", [
            'numero' => 'A1', 'titre_foncier' => 'TF/1', 'type' => 'appartement', 'etage' => 1,
            'tantieme' => 100, 'immeuble_id' => $this->imm->id, 'categorie_lot_id' => $catAutre->id,
        ])
        ->assertStatus(422)->assertJsonValidationErrors('categorie_lot_id');
});

it('génère les appels de fonds selon la cotisation de la catégorie', function () {
    $studio = CategorieLot::create(['tenant_id' => $this->tenant->id, 'residence_id' => $this->residence->id, 'nom' => 'Studio', 'cotisation' => 500]);
    $f3 = CategorieLot::create(['tenant_id' => $this->tenant->id, 'residence_id' => $this->residence->id, 'nom' => 'F3', 'cotisation' => 800]);

    $mk = function (string $num, CategorieLot $cat) {
        $lot = Lot::withoutGlobalScope('tenant')->create(['tenant_id' => $this->tenant->id, 'residence_id' => $this->residence->id, 'immeuble_id' => $this->imm->id, 'categorie_lot_id' => $cat->id, 'numero' => $num, 'type' => 'appartement', 'etage' => 1, 'tantieme' => 100]);
        $u = User::create(['tenant_id' => $this->tenant->id, 'name' => 'R'.$num, 'phone' => '+21261000'.rand(1000, 9999), 'role' => 'resident', 'status' => 'active']);

        return Coproprietaire::create(['tenant_id' => $this->tenant->id, 'user_id' => $u->id, 'lot_id' => $lot->id, 'type' => 'proprietaire', 'solde_actuel' => 0]);
    };
    $cStudio = $mk('A1', $studio);
    $cF3 = $mk('A2', $f3);

    $af = AppelFonds::withoutGlobalScope('tenant')->create([
        'tenant_id' => $this->tenant->id, 'residence_id' => $this->residence->id, 'created_by' => $this->manager->id,
        'libelle' => 'Q3', 'montant_total' => 0, 'date_echeance' => Carbon::now()->addMonth(), 'statut' => 'brouillon',
    ]);
    $af->genererLignes();

    expect((float) $af->lignes()->where('coproprietaire_id', $cStudio->id)->value('montant_du'))->toBe(500.0)
        ->and((float) $af->lignes()->where('coproprietaire_id', $cF3->id)->value('montant_du'))->toBe(800.0);
});
