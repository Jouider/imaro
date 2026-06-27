<?php

use App\Jobs\GenerateRecuPaiementJob;
use App\Models\CompteBancaire;
use App\Models\Coproprietaire;
use App\Models\Exercice;
use App\Models\Immeuble;
use App\Models\Lot;
use App\Models\Paiement;
use App\Models\Residence;
use App\Models\Tenant;
use App\Models\User;
use App\Models\VirementDeclare;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Facades\Storage;
use Spatie\Permission\Models\Role;

uses(RefreshDatabase::class);

beforeEach(function () {
    // Comme en prod (queue redis) : les jobs ne s'exécutent pas dans le cycle requête.
    // Évite aussi le listener tenant-aware de Spatie qui plante avec le driver sync.
    Queue::fake();

    foreach (['manager', 'gestionnaire', 'conseil', 'resident'] as $r) {
        Role::firstOrCreate(['name' => $r, 'guard_name' => 'web']);
    }

    $this->tenant = Tenant::create(['name' => 'T', 'email' => 't@t.ma', 'subdomain' => 't', 'plan' => 'starter', 'status' => 'active']);
    config(['app.tenant_id' => $this->tenant->id]);

    $this->gest = User::create(['tenant_id' => $this->tenant->id, 'name' => 'Gest', 'phone' => '+212600000001', 'role' => 'gestionnaire', 'status' => 'active']);
    $this->gest->assignRole('gestionnaire');

    $this->residence = Residence::withoutGlobalScope('tenant')->create([
        'tenant_id' => $this->tenant->id, 'gestionnaire_id' => $this->gest->id, 'name' => 'Aqualina',
        'address' => 'X', 'city' => 'Casa', 'total_tantieme' => 1000, 'nb_lots' => 1, 'status' => 'active', 'mode_cotisation' => 'tantieme',
    ]);
    $imm = Immeuble::withoutGlobalScope('tenant')->create(['tenant_id' => $this->tenant->id, 'residence_id' => $this->residence->id, 'nom' => 'A', 'nb_etages' => 1, 'nb_lots' => 1]);
    $this->lot = Lot::withoutGlobalScope('tenant')->create(['tenant_id' => $this->tenant->id, 'residence_id' => $this->residence->id, 'immeuble_id' => $imm->id, 'numero' => 'A1', 'type' => 'appartement', 'etage' => 1, 'tantieme' => 1000]);
    Exercice::withoutGlobalScope('tenant')->create(['tenant_id' => $this->tenant->id, 'residence_id' => $this->residence->id, 'annee' => 2026, 'date_debut' => '2026-01-01', 'date_fin' => '2026-12-31', 'statut' => 'actif']);

    $this->resident = User::create(['tenant_id' => $this->tenant->id, 'name' => 'Hassan', 'phone' => '+212611111111', 'role' => 'resident', 'status' => 'active', 'password' => bcrypt('x')]);
    $this->resident->assignRole('resident');
    $this->copro = Coproprietaire::create(['tenant_id' => $this->tenant->id, 'user_id' => $this->resident->id, 'lot_id' => $this->lot->id, 'type' => 'proprietaire', 'solde_actuel' => 0]);

    CompteBancaire::create(['tenant_id' => $this->tenant->id, 'residence_id' => $this->residence->id, 'banque' => 'Attijari', 'titulaire' => 'Syndic Aqualina', 'rib' => '007780000123456789012345', 'iban' => 'MA64...', 'is_primary' => true]);

    $this->resAuth = ['Authorization' => 'Bearer '.$this->resident->createToken('t')->plainTextToken];
    $this->gestAuth = ['Authorization' => 'Bearer '.$this->gest->createToken('t')->plainTextToken];
});

it('le résident voit les comptes bancaires de sa résidence', function () {
    $this->withHeaders($this->resAuth)->getJson('/api/portail/comptes-bancaires')
        ->assertStatus(200)
        ->assertJsonPath('data.comptes.0.rib', '007780000123456789012345')
        ->assertJsonPath('data.comptes.0.is_primary', true);
});

it('le résident déclare un paiement → virement en_attente', function () {
    $this->withHeaders($this->resAuth)->postJson('/api/portail/paiements', [
        'montant' => 1500, 'date' => '2026-06-10', 'methode' => 'virement', 'reference' => 'VIR-001',
    ])->assertStatus(201);

    $v = VirementDeclare::where('coproprietaire_id', $this->copro->id)->first();
    expect($v)->not->toBeNull()
        ->and($v->statut)->toBe('en_attente')
        ->and((float) $v->montant)->toBe(1500.0);
});

it('le gestionnaire valide un virement → crée un Paiement réel', function () {
    $v = VirementDeclare::create([
        'tenant_id' => $this->tenant->id, 'residence_id' => $this->residence->id, 'coproprietaire_id' => $this->copro->id,
        'montant' => 1500, 'date_declaration' => '2026-06-10', 'methode' => 'virement', 'statut' => 'en_attente',
    ]);

    $this->withHeaders($this->gestAuth)->postJson("/api/gestionnaire/virements-declares/{$v->id}/valider")
        ->assertStatus(200)
        ->assertJsonPath('data.statut', 'valide');

    expect(Paiement::where('coproprietaire_id', $this->copro->id)->where('montant', 1500)->exists())->toBeTrue()
        ->and($v->fresh()->paiement_id)->not->toBeNull();
});

it('valider un virement (copro à jour) crédite le solde + génère le reçu', function () {
    $v = VirementDeclare::create([
        'tenant_id' => $this->tenant->id, 'residence_id' => $this->residence->id, 'coproprietaire_id' => $this->copro->id,
        'montant' => 1500, 'date_declaration' => '2026-06-10', 'methode' => 'virement', 'statut' => 'en_attente',
    ]);

    $this->withHeaders($this->gestAuth)
        ->postJson("/api/gestionnaire/virements-declares/{$v->id}/valider")
        ->assertStatus(200);

    // Le copro était à jour (0 ligne) : le paiement non alloué devient un crédit de +1500.
    expect($this->copro->fresh()->solde_actuel)->toBe(1500.0);

    // Le reçu PDF est généré en asynchrone.
    Queue::assertPushed(GenerateRecuPaiementJob::class);
});

it('le gestionnaire peut valider un paiement déclaré immédiatement (pas de délai 24 h)', function () {
    // Déclaration fraîche (à l'instant) : aucune attente imposée.
    $v = VirementDeclare::create([
        'tenant_id' => $this->tenant->id, 'residence_id' => $this->residence->id, 'coproprietaire_id' => $this->copro->id,
        'montant' => 300, 'date_declaration' => now()->toDateString(), 'methode' => 'virement',
        'reference' => 'VIR-024', 'statut' => 'en_attente',
    ]);

    $this->withHeaders($this->gestAuth)->postJson("/api/gestionnaire/virements-declares/{$v->id}/valider")
        ->assertStatus(200)
        ->assertJsonPath('data.statut', 'valide');
});

it('le résident liste ses paiements déclarés ; le reçu apparaît après validation', function () {
    Storage::fake('public');
    $v = VirementDeclare::create([
        'tenant_id' => $this->tenant->id, 'residence_id' => $this->residence->id, 'coproprietaire_id' => $this->copro->id,
        'montant' => 300, 'date_declaration' => '2026-06-27', 'methode' => 'virement', 'reference' => 'VIR-025',
        'statut' => 'en_attente',
    ]);

    // En attente → pas de reçu.
    $this->withHeaders($this->resAuth)->getJson('/api/portail/paiements')
        ->assertStatus(200)
        ->assertJsonPath('data.paiements.0.statut', 'en_attente')
        ->assertJsonPath('data.paiements.0.recu_url', null);

    // Simule la validation (le flux HTTP /valider est couvert par les tests ci-dessus ;
    // ici on isole la vue résident pour éviter le cache de guard entre users).
    $paiement = Paiement::create([
        'tenant_id' => $this->tenant->id, 'coproprietaire_id' => $this->copro->id, 'saisi_par' => $this->gest->id,
        'montant' => 300, 'date_paiement' => '2026-06-27', 'mode' => 'virement', 'reference' => 'VIR-025',
    ]);
    (new GenerateRecuPaiementJob($paiement->id))->handle();
    $v->update(['statut' => 'valide', 'paiement_id' => $paiement->id, 'date_validation' => now()]);

    $this->withHeaders($this->resAuth)->getJson('/api/portail/paiements')
        ->assertStatus(200)
        ->assertJsonPath('data.paiements.0.statut', 'valide')
        ->assertJsonPath('data.paiements.0.recu_url', fn ($url) => is_string($url) && str_contains($url, '.pdf'));
});

it('le tableau de bord reflète une avance (paiement non alloué) en crédit', function () {
    // Paiement sans ligne d'appel (avance / copro à jour) → balance positive.
    Paiement::create([
        'tenant_id' => $this->tenant->id, 'coproprietaire_id' => $this->copro->id, 'saisi_par' => $this->gest->id,
        'montant' => 1500, 'date_paiement' => '2026-06-10', 'mode' => 'virement',
    ]);

    $this->withHeaders($this->resAuth)->getJson('/api/portail/dashboard')
        ->assertStatus(200)
        ->assertJsonPath('data.balance', 1500)
        ->assertJsonPath('data.statut', 'a_jour');
});

it('le reçu PDF est réellement produit et rattaché au paiement', function () {
    Storage::fake('public');

    $paiement = Paiement::create([
        'tenant_id' => $this->tenant->id, 'coproprietaire_id' => $this->copro->id, 'saisi_par' => $this->gest->id,
        'montant' => 1500, 'date_paiement' => '2026-06-10', 'mode' => 'virement', 'reference' => 'VIR-009',
    ]);

    (new GenerateRecuPaiementJob($paiement->id))->handle();

    $path = $paiement->fresh()->recu_pdf_path;
    expect($path)->not->toBeNull();
    Storage::disk('public')->assertExists($path);
});

it('le gestionnaire liste les virements déclarés avec nom + lot', function () {
    VirementDeclare::create([
        'tenant_id' => $this->tenant->id, 'residence_id' => $this->residence->id, 'coproprietaire_id' => $this->copro->id,
        'montant' => 900, 'date_declaration' => '2026-06-08', 'methode' => 'versement', 'statut' => 'en_attente',
    ]);

    $this->withHeaders($this->gestAuth)->getJson('/api/gestionnaire/virements-declares')
        ->assertStatus(200)
        ->assertJsonPath('data.0.coproprietaire_nom', 'Hassan')
        ->assertJsonPath('data.0.lot_numero', 'A1');
});

it('rejette une déclaration sans montant (422)', function () {
    $this->withHeaders($this->resAuth)->postJson('/api/portail/paiements', [
        'date' => '2026-06-10', 'methode' => 'virement',
    ])->assertStatus(422);
});
