<?php

/**
 * KAN-100 — exports comptables (Journal/Grand-Livre .xlsx, FEC, Journal/Balance PDF).
 */

use App\Models\AutreRecette;
use App\Models\Coproprietaire;
use App\Models\Depense;
use App\Models\Emprunt;
use App\Models\Equipement;
use App\Models\Exercice;
use App\Models\Immeuble;
use App\Models\Lot;
use App\Models\Paiement;
use App\Models\Remboursement;
use App\Models\Residence;
use App\Models\Tenant;
use App\Models\TravauxExceptionnel;
use App\Models\User;
use App\Services\Comptabilite\ComptabiliteExportService;
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
    $resident = User::create(['tenant_id' => $this->tenant->id, 'name' => 'Hassan', 'phone' => '+212611111111', 'role' => 'resident', 'status' => 'active']);
    $this->copro = Coproprietaire::create(['tenant_id' => $this->tenant->id, 'user_id' => $resident->id, 'lot_id' => $lot->id, 'type' => 'proprietaire', 'solde_actuel' => 0]);

    $this->ex = Exercice::withoutGlobalScope('tenant')->create(['tenant_id' => $this->tenant->id, 'residence_id' => $this->residence->id, 'annee' => 2026, 'date_debut' => '2026-01-01', 'date_fin' => '2026-12-31', 'statut' => 'actif']);
    Paiement::create(['tenant_id' => $this->tenant->id, 'exercice_id' => $this->ex->id, 'coproprietaire_id' => $this->copro->id, 'saisi_par' => $this->manager->id, 'montant' => 600, 'mode' => 'virement', 'reference' => 'VIR-001', 'date_paiement' => '2026-04-01']);
    Depense::create(['tenant_id' => $this->tenant->id, 'exercice_id' => $this->ex->id, 'residence_id' => $this->residence->id, 'created_by' => $this->manager->id, 'categorie' => 'nettoyage', 'description' => 'Ménage avril', 'montant' => 250, 'statut' => 'paye', 'date' => '2026-04-05']);

    $this->auth = ['Authorization' => 'Bearer '.$this->manager->createToken('t')->plainTextToken];
    $this->base = "/api/gestionnaire/comptabilite/exercices/{$this->ex->id}/export";
});

it('exporte le Journal en .xlsx', function () {
    $res = $this->withHeaders($this->auth)->get("{$this->base}/journal.xlsx")->assertStatus(200);
    expect($res->headers->get('content-type'))->toContain('spreadsheetml');
    expect($res->headers->get('content-disposition'))->toContain('journal-2026.xlsx');
});

it('exporte le Grand-Livre en .xlsx', function () {
    $this->withHeaders($this->auth)->get("{$this->base}/grand-livre.xlsx")
        ->assertStatus(200)
        ->assertHeader('content-type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
});

it('exporte le FEC (tabulé, en-tête normalisé + lignes équilibrées)', function () {
    $res = $this->withHeaders($this->auth)->get("{$this->base}/fec")->assertStatus(200);
    $res->assertHeader('content-disposition', 'attachment; filename="FEC-2026.txt"');

    $body = $res->getContent();
    $lines = explode("\r\n", trim($body));
    expect($lines[0])->toContain("JournalCode\tJournalLib\tEcritureNum");
    // 1 paiement + 1 dépense = 2 écritures = 4 lignes + 1 en-tête.
    expect(count($lines))->toBe(5);
    expect($lines[1])->toContain("\t");
});

it('exporte le Journal en PDF', function () {
    $res = $this->withHeaders($this->auth)->get("{$this->base}/journal.pdf")->assertStatus(200);
    $res->assertHeader('content-type', 'application/pdf');
    expect($res->getContent())->toStartWith('%PDF');
});

it('exporte la Balance en PDF', function () {
    $res = $this->withHeaders($this->auth)->get("{$this->base}/balance.pdf")->assertStatus(200);
    $res->assertHeader('content-type', 'application/pdf');
    expect($res->getContent())->toStartWith('%PDF');
});

it('intègre une autre recette au journal — débit banque / crédit produit (KAN-130)', function () {
    AutreRecette::create([
        'tenant_id' => $this->tenant->id,
        'residence_id' => $this->residence->id,
        'exercice' => 2026,
        'date' => '2026-05-10',
        'libelle' => 'Location parking visiteurs',
        'categorie' => 'location_parking',
        'montant' => 1200,
        'reference' => 'REC-P1',
    ]);

    $entries = app(ComptabiliteExportService::class)->rawEntries($this->ex);

    // Le compte 7082 (produits de location) ne provient que de l'autre recette.
    $recette = $entries->firstWhere('compte_credit', '7082');
    expect($recette)->not->toBeNull();
    expect($recette['compte_debit'])->toBe('5121');
    expect($recette['montant'])->toBe(1200.0);
    expect($recette['type'])->toBe('encaissement');
    expect($recette['libelle'])->toBe('Location parking visiteurs');
});

it('intègre remboursements, travaux, équipements et emprunts au journal (KAN-130 2..5)', function () {
    Remboursement::create([
        'tenant_id' => $this->tenant->id, 'residence_id' => $this->residence->id,
        'coproprietaire_id' => $this->copro->id, 'coproprietaire_nom' => 'Hassan', 'motif' => 'trop_percu', 'description' => 'Trop-perçu Q1',
        'montant' => 300, 'date_demande' => '2026-05-20', 'date_paiement' => '2026-06-01',
        'mode_paiement' => 'virement', 'statut' => 'paye', 'reference' => 'RMB-X',
    ]);
    TravauxExceptionnel::create([
        'tenant_id' => $this->tenant->id, 'residence_id' => $this->residence->id,
        'libelle' => 'Ravalement façade', 'date_vote_ag' => '2026-02-15', 'montant_vote' => 5000, 'montant_engage' => 5000,
        'montant_regle' => 5000, 'date_debut' => '2026-03-01', 'date_fin_reelle' => '2026-05-01',
        'statut' => 'termine',
    ]);
    Equipement::create([
        'tenant_id' => $this->tenant->id, 'residence_id' => $this->residence->id,
        'designation' => 'Ascenseur A', 'categorie' => 'ascenseur', 'date_acquisition' => '2026-02-01',
        'valeur_acquisition' => 80000, 'duree_amortissement_mois' => 120, 'valeur_nette' => 80000, 'actif' => true,
    ]);
    Emprunt::create([
        'tenant_id' => $this->tenant->id, 'residence_id' => $this->residence->id,
        'libelle' => 'Prêt travaux', 'organisme' => 'BMCE', 'date_debut' => '2026-01-15', 'date_fin' => '2027-01-15',
        'montant_initial' => 100000, 'taux_interet' => 4.5, 'duree_mois' => 12, 'mensualite' => 8500,
        'paye_cumule' => 17000, 'paye_exercice' => 17000, 'reste' => 83000, 'statut' => 'actif',
    ]);

    $entries = app(ComptabiliteExportService::class)->rawEntries($this->ex);

    $rb = $entries->firstWhere('compte_debit', '4411');
    expect($rb)->not->toBeNull();
    expect($rb['compte_credit'])->toBe('5121');
    expect($rb['montant'])->toBe(300.0);

    $tx = $entries->firstWhere('compte_debit', '6500');
    expect($tx)->not->toBeNull();
    expect($tx['montant'])->toBe(5000.0);

    $eq = $entries->firstWhere('compte_debit', '2300');
    expect($eq)->not->toBeNull();
    expect($eq['montant'])->toBe(80000.0);

    $deblocage = $entries->firstWhere('compte_credit', '1481');
    expect($deblocage)->not->toBeNull();
    expect($deblocage['type'])->toBe('encaissement');
    expect($deblocage['montant'])->toBe(100000.0);

    $rembEmprunt = $entries->first(fn ($e) => $e['compte_debit'] === '1481');
    expect($rembEmprunt)->not->toBeNull();
    expect($rembEmprunt['montant'])->toBe(17000.0);
});

it('refuse (403) un gestionnaire non assigné à la résidence', function () {
    $autre = User::create(['tenant_id' => $this->tenant->id, 'name' => 'Autre', 'phone' => '+212699998877', 'role' => 'gestionnaire', 'status' => 'active']);
    $autre->assignRole('gestionnaire');
    $auth = ['Authorization' => 'Bearer '.$autre->createToken('t')->plainTextToken];

    $this->withHeaders($auth)->get("{$this->base}/journal.pdf")->assertStatus(403);
});
