<?php

use App\Models\Assemblee;
use App\Models\AutreRecette;
use App\Models\Coproprietaire;
use App\Models\Emprunt;
use App\Models\Equipement;
use App\Models\Exercice;
use App\Models\Immeuble;
use App\Models\Lot;
use App\Models\Remboursement;
use App\Models\Residence;
use App\Models\Tenant;
use App\Models\TravauxExceptionnel;
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

    $this->immeuble = Immeuble::withoutGlobalScopes()->create([
        'tenant_id' => $this->tenant->id, 'residence_id' => $this->residence->id,
        'nom' => 'Immeuble A', 'adresse' => 'Bd Zerktouni', 'nb_etages' => 5, 'nb_lots' => 0,
    ]);

    $this->lot = Lot::create([
        'tenant_id' => $this->tenant->id, 'residence_id' => $this->residence->id,
        'immeuble_id' => $this->immeuble->id,
        'numero' => 'A-01', 'type' => 'appartement', 'etage' => 1, 'tantieme' => 50,
    ]);

    $this->token = $this->gestionnaire->createToken('test')->plainTextToken;
    $this->headers = ['Authorization' => "Bearer {$this->token}"];
});

function createCopro($test, string $name, string $phone): Coproprietaire
{
    $user = User::create([
        'tenant_id' => $test->tenant->id, 'name' => $name,
        'phone' => $phone, 'role' => 'resident', 'status' => 'active',
    ]);
    return Coproprietaire::create([
        'tenant_id' => $test->tenant->id, 'user_id' => $user->id,
        'lot_id' => $test->lot->id, 'type' => 'proprietaire', 'date_entree' => '2020-01-01',
    ]);
}

// ─── Équipements ──────────────────────────────────────────────────────────────

it('creates an equipement with auto-calculated valeur_nette', function () {
    $response = $this->withHeaders($this->headers)
        ->postJson("/api/gestionnaire/residences/{$this->residence->id}/equipements", [
            'designation' => 'Ascenseur Otis',
            'categorie' => 'ascenseur',
            'date_acquisition' => '2024-01-01',
            'valeur_acquisition' => 180000,
            'duree_amortissement_mois' => 240,
            'actif' => true,
        ])
        ->assertStatus(201)
        ->assertJsonPath('data.equipement.designation', 'Ascenseur Otis');

    $valeurNette = $response->json('data.equipement.valeur_nette');
    expect($valeurNette)->toBeLessThan(180000)
        ->and($valeurNette)->toBeGreaterThan(0);
});

it('lists equipements for a residence', function () {
    Equipement::create([
        'tenant_id' => $this->tenant->id, 'residence_id' => $this->residence->id,
        'designation' => 'Pompe', 'categorie' => 'plomberie',
        'date_acquisition' => '2023-01-01', 'valeur_acquisition' => 12000,
        'duree_amortissement_mois' => 120, 'valeur_nette' => 8000, 'actif' => true,
    ]);

    $this->withHeaders($this->headers)
        ->getJson("/api/gestionnaire/residences/{$this->residence->id}/equipements")
        ->assertStatus(200)
        ->assertJsonCount(1, 'data.equipements')
        ->assertJsonPath('data.equipements.0.designation', 'Pompe');
});

it('updates an equipement', function () {
    $equip = Equipement::create([
        'tenant_id' => $this->tenant->id, 'residence_id' => $this->residence->id,
        'designation' => 'Ancien', 'categorie' => 'autre',
        'date_acquisition' => '2022-01-01', 'valeur_acquisition' => 10000,
        'duree_amortissement_mois' => 60, 'valeur_nette' => 5000, 'actif' => true,
    ]);

    $this->withHeaders($this->headers)
        ->putJson("/api/gestionnaire/equipements/{$equip->id}", ['designation' => 'Nouveau nom'])
        ->assertStatus(200)
        ->assertJsonPath('data.equipement.designation', 'Nouveau nom');
});

it('deletes an equipement', function () {
    $equip = Equipement::create([
        'tenant_id' => $this->tenant->id, 'residence_id' => $this->residence->id,
        'designation' => 'A supprimer', 'categorie' => 'autre',
        'date_acquisition' => '2022-01-01', 'valeur_acquisition' => 5000,
        'duree_amortissement_mois' => 60, 'valeur_nette' => 2000, 'actif' => true,
    ]);

    $this->withHeaders($this->headers)
        ->deleteJson("/api/gestionnaire/equipements/{$equip->id}")
        ->assertStatus(200);

    expect(Equipement::find($equip->id))->toBeNull();
});

// ─── Emprunts ─────────────────────────────────────────────────────────────────

it('creates an emprunt with correct defaults', function () {
    $this->withHeaders($this->headers)
        ->postJson("/api/gestionnaire/residences/{$this->residence->id}/emprunts", [
            'libelle' => 'Réfection toiture',
            'organisme' => 'Banque Populaire',
            'date_debut' => '2024-01-01',
            'date_fin' => '2029-01-01',
            'montant_initial' => 240000,
            'taux_interet' => 4.5,
            'duree_mois' => 60,
            'mensualite' => 4475,
        ])
        ->assertStatus(201)
        ->assertJsonPath('data.emprunt.reste', 240000)
        ->assertJsonPath('data.emprunt.paye_cumule', 0)
        ->assertJsonPath('data.emprunt.statut', 'actif');
});

it('lists emprunts for a residence', function () {
    Emprunt::create([
        'tenant_id' => $this->tenant->id, 'residence_id' => $this->residence->id,
        'libelle' => 'Emprunt test', 'organisme' => 'CIH',
        'date_debut' => '2023-01-01', 'date_fin' => '2028-01-01',
        'montant_initial' => 100000, 'taux_interet' => 5, 'duree_mois' => 60,
        'mensualite' => 1887, 'paye_cumule' => 20000, 'paye_exercice' => 10000,
        'reste' => 80000, 'statut' => 'actif',
    ]);

    $this->withHeaders($this->headers)
        ->getJson("/api/gestionnaire/residences/{$this->residence->id}/emprunts")
        ->assertStatus(200)
        ->assertJsonCount(1, 'data.emprunts');
});

it('updates emprunt statut', function () {
    $emprunt = Emprunt::create([
        'tenant_id' => $this->tenant->id, 'residence_id' => $this->residence->id,
        'libelle' => 'Test', 'organisme' => 'CIH',
        'date_debut' => '2023-01-01', 'date_fin' => '2028-01-01',
        'montant_initial' => 100000, 'taux_interet' => 5, 'duree_mois' => 60,
        'mensualite' => 1887, 'reste' => 0, 'statut' => 'actif',
    ]);

    $this->withHeaders($this->headers)
        ->putJson("/api/gestionnaire/emprunts/{$emprunt->id}", ['statut' => 'rembourse'])
        ->assertStatus(200)
        ->assertJsonPath('data.emprunt.statut', 'rembourse');
});

// ─── Travaux exceptionnels ────────────────────────────────────────────────────

it('creates travaux exceptionnels', function () {
    $this->withHeaders($this->headers)
        ->postJson("/api/gestionnaire/residences/{$this->residence->id}/travaux-exceptionnels", [
            'libelle' => 'Ravalement façade nord',
            'date_vote_ag' => '2025-06-12',
            'prestataire' => 'Atlas Travaux SARL',
            'montant_vote' => 95000,
            'statut' => 'en_cours',
        ])
        ->assertStatus(201)
        ->assertJsonPath('data.travaux.libelle', 'Ravalement façade nord')
        ->assertJsonPath('data.travaux.montant_vote', 95000);
});

it('lists travaux for a residence', function () {
    TravauxExceptionnel::create([
        'tenant_id' => $this->tenant->id, 'residence_id' => $this->residence->id,
        'libelle' => 'Test travaux', 'date_vote_ag' => '2025-01-01',
        'montant_vote' => 50000, 'statut' => 'vote',
    ]);

    $this->withHeaders($this->headers)
        ->getJson("/api/gestionnaire/residences/{$this->residence->id}/travaux-exceptionnels")
        ->assertStatus(200)
        ->assertJsonCount(1, 'data.travaux');
});

it('updates travaux status to termine with date_fin_reelle', function () {
    $travaux = TravauxExceptionnel::create([
        'tenant_id' => $this->tenant->id, 'residence_id' => $this->residence->id,
        'libelle' => 'Travaux', 'date_vote_ag' => '2025-01-01',
        'montant_vote' => 50000, 'statut' => 'en_cours',
    ]);

    $this->withHeaders($this->headers)
        ->putJson("/api/gestionnaire/travaux-exceptionnels/{$travaux->id}", [
            'statut' => 'termine',
            'date_fin_reelle' => '2026-03-15',
        ])
        ->assertStatus(200)
        ->assertJsonPath('data.travaux.statut', 'termine')
        ->assertJsonPath('data.travaux.date_fin_reelle', '2026-03-15');
});

// ─── Autres recettes ─────────────────────────────────────────────────────────

it('creates an autre recette', function () {
    $this->withHeaders($this->headers)
        ->postJson("/api/gestionnaire/residences/{$this->residence->id}/autres-recettes", [
            'exercice' => 2026,
            'date' => '2026-03-01',
            'libelle' => 'Loyer parking C-12',
            'categorie' => 'location_parking',
            'montant' => 450,
            'payeur' => 'Karim El Fassi',
        ])
        ->assertStatus(201)
        ->assertJsonPath('data.recette.categorie', 'location_parking')
        ->assertJsonPath('data.recette.montant', 450);
});

it('lists recettes filtered by exercice', function () {
    AutreRecette::create([
        'tenant_id' => $this->tenant->id, 'residence_id' => $this->residence->id,
        'exercice' => 2026, 'date' => '2026-01-15', 'libelle' => 'Antenne',
        'categorie' => 'location_antenne', 'montant' => 1200,
    ]);
    AutreRecette::create([
        'tenant_id' => $this->tenant->id, 'residence_id' => $this->residence->id,
        'exercice' => 2025, 'date' => '2025-06-01', 'libelle' => 'Ancien',
        'categorie' => 'autre', 'montant' => 500,
    ]);

    $this->withHeaders($this->headers)
        ->getJson("/api/gestionnaire/residences/{$this->residence->id}/autres-recettes?exercice=2026")
        ->assertStatus(200)
        ->assertJsonCount(1, 'data.recettes');
});

it('rejects invalid recette categorie', function () {
    $this->withHeaders($this->headers)
        ->postJson("/api/gestionnaire/residences/{$this->residence->id}/autres-recettes", [
            'exercice' => 2026, 'date' => '2026-01-01', 'libelle' => 'Test',
            'categorie' => 'invalid_cat', 'montant' => 100,
        ])
        ->assertStatus(422);
});

// ─── Remboursements ──────────────────────────────────────────────────────────

it('creates a remboursement', function () {
    $copro = createCopro($this, 'Fatima Chraibi', '+212611000099');

    $this->withHeaders($this->headers)
        ->postJson("/api/gestionnaire/residences/{$this->residence->id}/remboursements", [
            'coproprietaire_id' => $copro->id,
            'coproprietaire_nom' => 'Fatima Chraibi',
            'lot_numero' => 'A-02',
            'motif' => 'trop_percu',
            'description' => 'Double versement Q1 2026',
            'montant' => 850,
            'date_demande' => '2026-04-22',
        ])
        ->assertStatus(201)
        ->assertJsonPath('data.remboursement.statut', 'demande')
        ->assertJsonPath('data.remboursement.montant', 850);
});

it('lists remboursements for a residence', function () {
    $copro = createCopro($this, 'Hassan', '+212611000098');

    Remboursement::create([
        'tenant_id' => $this->tenant->id, 'residence_id' => $this->residence->id,
        'coproprietaire_id' => $copro->id, 'coproprietaire_nom' => 'Hassan',
        'motif' => 'trop_percu', 'montant' => 500, 'date_demande' => '2026-01-01',
        'statut' => 'approuve',
    ]);

    $this->withHeaders($this->headers)
        ->getJson("/api/gestionnaire/residences/{$this->residence->id}/remboursements")
        ->assertStatus(200)
        ->assertJsonCount(1, 'data.remboursements')
        ->assertJsonPath('data.remboursements.0.statut', 'approuve');
});

it('updates remboursement to paid', function () {
    $copro = createCopro($this, 'Ali', '+212611000097');

    $remb = Remboursement::create([
        'tenant_id' => $this->tenant->id, 'residence_id' => $this->residence->id,
        'coproprietaire_id' => $copro->id, 'coproprietaire_nom' => 'Ali',
        'motif' => 'erreur_appel', 'montant' => 1200, 'date_demande' => '2026-03-01',
        'statut' => 'approuve',
    ]);

    $this->withHeaders($this->headers)
        ->putJson("/api/gestionnaire/remboursements/{$remb->id}", [
            'statut' => 'paye',
            'date_paiement' => '2026-03-28',
            'mode_paiement' => 'virement',
            'reference' => 'VIR-2026-128',
        ])
        ->assertStatus(200)
        ->assertJsonPath('data.remboursement.statut', 'paye')
        ->assertJsonPath('data.remboursement.date_paiement', '2026-03-28');
});

it('deletes a remboursement', function () {
    $copro = createCopro($this, 'X', '+212611000096');

    $remb = Remboursement::create([
        'tenant_id' => $this->tenant->id, 'residence_id' => $this->residence->id,
        'coproprietaire_id' => $copro->id, 'coproprietaire_nom' => 'X',
        'motif' => 'autre', 'montant' => 100, 'date_demande' => '2026-01-01',
    ]);

    $this->withHeaders($this->headers)
        ->deleteJson("/api/gestionnaire/remboursements/{$remb->id}")
        ->assertStatus(200);

    expect(Remboursement::find($remb->id))->toBeNull();
});
