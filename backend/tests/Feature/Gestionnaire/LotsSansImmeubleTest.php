<?php

/*
 * KAN-150 — création des lots dans une résidence neuve.
 *
 * Parcours signalé : nouvelle résidence → « Skip » (on ne crée pas d'immeuble)
 * → « Confirmer » → l'étape de génération des lots ne produit rien.
 *
 * Cause : `ResidenceController::store` ne crée aucun immeuble, et les deux
 * chemins de création de lot exigeaient un immeuble préexistant — `store()`
 * échouait en 404 (firstOrFail) et `bulkStore()` écartait silencieusement
 * chaque ligne avec « immeuble introuvable ». Une résidence simple, sans
 * découpage en bâtiments, était donc impossible à remplir.
 */

use App\Models\Immeuble;
use App\Models\Lot;
use App\Models\Residence;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Role;

uses(RefreshDatabase::class);

beforeEach(function () {
    foreach (['manager', 'gestionnaire'] as $role) {
        Role::firstOrCreate(['name' => $role, 'guard_name' => 'web']);
    }

    $this->tenant = Tenant::create([
        'name' => 'Test Syndic', 'email' => 'kan150@syndic.ma',
        'subdomain' => 'kan150', 'plan' => 'starter', 'status' => 'active',
    ]);
    config(['app.tenant_id' => $this->tenant->id]);

    $this->gestionnaire = User::create([
        'tenant_id' => $this->tenant->id,
        'name' => 'Karim Gestionnaire',
        'phone' => '+212611000150',
        'role' => 'gestionnaire',
        'status' => 'active',
    ]);
    $this->gestionnaire->assignRole('gestionnaire');

    // Résidence fraîchement créée : AUCUN immeuble (l'utilisateur a fait « Skip »).
    $this->residence = Residence::withoutGlobalScopes()->create([
        'tenant_id' => $this->tenant->id,
        'gestionnaire_id' => $this->gestionnaire->id,
        'name' => 'Résidence Neuve',
        'address' => 'Bd Zerktouni',
        'city' => 'Casablanca',
        'total_tantieme' => 1000,
        'nb_lots' => 0,
        'status' => 'active',
        'mode_cotisation' => 'tantieme',
    ]);

    $this->auth = ['Authorization' => 'Bearer '.$this->gestionnaire->createToken('t')->plainTextToken];
});

it('génère les lots en masse dans une résidence sans immeuble', function () {
    expect(Immeuble::withoutGlobalScopes()->where('residence_id', $this->residence->id)->count())->toBe(0);

    $res = $this->withHeaders($this->auth)
        ->postJson("/api/gestionnaire/residences/{$this->residence->id}/lots/bulk", [
            'lots' => [
                ['numero' => 'A1', 'titre_foncier' => 'TF-001', 'type' => 'appartement', 'tantieme' => 400],
                ['numero' => 'A2', 'titre_foncier' => 'TF-002', 'type' => 'appartement', 'tantieme' => 350],
                ['numero' => 'A3', 'titre_foncier' => 'TF-003', 'type' => 'appartement', 'tantieme' => 250],
            ],
        ])->assertStatus(200);

    // Le cœur du bug : 0 créé et 3 erreurs « immeuble introuvable ».
    expect($res->json('data.created'))->toBe(3);
    expect($res->json('data.errors'))->toBe([]);
    expect(Lot::withoutGlobalScopes()->where('residence_id', $this->residence->id)->count())->toBe(3);

    // Un immeuble par défaut a été créé pour porter les lots.
    $immeubles = Immeuble::withoutGlobalScopes()->where('residence_id', $this->residence->id)->get();
    expect($immeubles)->toHaveCount(1);
    expect($immeubles->first()->nb_lots)->toBe(3);
});

it('crée un lot unique dans une résidence sans immeuble', function () {
    $this->withHeaders($this->auth)
        ->postJson("/api/gestionnaire/residences/{$this->residence->id}/lots", [
            'numero' => 'B1',
            'titre_foncier' => 'TF-100',
            'type' => 'appartement',
            'etage' => 1,
            'tantieme' => 500,
        ])->assertStatus(201);

    expect(Lot::withoutGlobalScopes()->where('residence_id', $this->residence->id)->count())->toBe(1);
    expect(Immeuble::withoutGlobalScopes()->where('residence_id', $this->residence->id)->count())->toBe(1);
});

it("réutilise l'immeuble par défaut au lieu d'en créer un par appel", function () {
    $url = "/api/gestionnaire/residences/{$this->residence->id}/lots";

    $this->withHeaders($this->auth)->postJson($url, [
        'numero' => 'C1', 'titre_foncier' => 'TF-201', 'type' => 'appartement', 'etage' => 1, 'tantieme' => 300,
    ])->assertStatus(201);

    $this->withHeaders($this->auth)->postJson($url, [
        'numero' => 'C2', 'titre_foncier' => 'TF-202', 'type' => 'appartement', 'etage' => 1, 'tantieme' => 200,
    ])->assertStatus(201);

    expect(Immeuble::withoutGlobalScopes()->where('residence_id', $this->residence->id)->count())->toBe(1);
});

it("n'invente pas d'immeuble quand la résidence en a déjà un", function () {
    $immeuble = Immeuble::withoutGlobalScopes()->create([
        'tenant_id' => $this->tenant->id,
        'residence_id' => $this->residence->id,
        'nom' => 'Bâtiment A',
        'nb_etages' => 4,
        'nb_lots' => 0,
    ]);

    $this->withHeaders($this->auth)
        ->postJson("/api/gestionnaire/residences/{$this->residence->id}/lots/bulk", [
            'lots' => [['numero' => 'D1', 'titre_foncier' => 'TF-300', 'type' => 'appartement', 'tantieme' => 100]],
        ])->assertStatus(200);

    $immeubles = Immeuble::withoutGlobalScopes()->where('residence_id', $this->residence->id)->get();
    expect($immeubles)->toHaveCount(1);
    expect($immeubles->first()->id)->toBe($immeuble->id);
    expect(Lot::withoutGlobalScopes()->where('residence_id', $this->residence->id)->first()->immeuble_id)->toBe($immeuble->id);
});
