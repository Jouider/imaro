<?php

use App\Jobs\GenerateBonPaiementPdfJob;
use App\Jobs\SendNativePushJob;
use App\Models\BonPaiement;
use App\Models\Coproprietaire;
use App\Models\Immeuble;
use App\Models\Lot;
use App\Models\Residence;
use App\Models\Tenant;
use App\Models\Ticket;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Facades\Storage;
use Spatie\Permission\Models\Role;

uses(RefreshDatabase::class);

beforeEach(function () {
    Queue::fake(); // comme en prod (redis) : les jobs ne tournent pas dans la requête

    foreach (['manager', 'gestionnaire', 'resident'] as $r) {
        Role::firstOrCreate(['name' => $r, 'guard_name' => 'web']);
    }

    $this->tenant = Tenant::create(['name' => 'T', 'email' => 't@t.ma', 'subdomain' => 't', 'plan' => 'business', 'status' => 'active']);
    config(['app.tenant_id' => $this->tenant->id]);

    $this->manager = User::create(['tenant_id' => $this->tenant->id, 'name' => 'Mgr', 'phone' => '+212600000001', 'role' => 'manager', 'status' => 'active']);
    $this->manager->assignRole('manager');

    $this->residence = Residence::withoutGlobalScope('tenant')->create(['tenant_id' => $this->tenant->id, 'gestionnaire_id' => $this->manager->id, 'name' => 'Aqualina', 'address' => 'X', 'city' => 'Casa', 'total_tantieme' => 1000, 'nb_lots' => 1, 'status' => 'active', 'mode_cotisation' => 'tantieme']);
    $imm = Immeuble::withoutGlobalScope('tenant')->create(['tenant_id' => $this->tenant->id, 'residence_id' => $this->residence->id, 'nom' => 'A', 'nb_etages' => 1, 'nb_lots' => 1]);
    $this->lot = Lot::withoutGlobalScope('tenant')->create(['tenant_id' => $this->tenant->id, 'residence_id' => $this->residence->id, 'immeuble_id' => $imm->id, 'numero' => 'A1', 'type' => 'appartement', 'etage' => 1, 'tantieme' => 1000]);

    $this->resident = User::create(['tenant_id' => $this->tenant->id, 'name' => 'Hassan Benali', 'phone' => '+212611111111', 'role' => 'resident', 'status' => 'active', 'password' => bcrypt('x')]);
    $this->resident->assignRole('resident');
    $this->copro = Coproprietaire::create(['tenant_id' => $this->tenant->id, 'user_id' => $this->resident->id, 'lot_id' => $this->lot->id, 'type' => 'proprietaire', 'solde_actuel' => 0]);

    $this->resAuth = ['Authorization' => 'Bearer '.$this->resident->createToken('t')->plainTextToken];
    $this->gestAuth = ['Authorization' => 'Bearer '.$this->manager->createToken('t')->plainTextToken];
});

function creerBon(array $overrides = []): BonPaiement
{
    return BonPaiement::create(array_merge([
        'tenant_id' => test()->tenant->id,
        'residence_id' => test()->residence->id,
        'coproprietaire_id' => test()->copro->id,
        'compte_emetteur' => 'Compte chèque · 000335E000304708',
        'beneficiaire' => 'Syndic Résidence Aqualina',
        'montant' => 1500,
        'motif' => 'Appel de fonds T1 2026',
        'statut' => 'en_attente',
        'validable_at' => now()->addHours(24),
    ], $overrides));
}

it('le résident crée un bon → 201, statut en_attente, validable_at = now + 24 h', function () {
    $res = $this->withHeaders($this->resAuth)->postJson('/api/portail/bons-paiement', [
        'compte_emetteur' => 'Compte chèque · 000335E000304708',
        'beneficiaire' => 'Syndic Résidence Aqualina',
        'montant' => 1500,
        'motif' => 'Appel de fonds T1 2026',
    ])->assertStatus(201)
        ->assertJsonPath('status', 'success')
        ->assertJsonPath('data.bon.statut', 'en_attente')
        ->assertJsonPath('data.bon.montant', 1500);

    $bon = BonPaiement::first();
    expect($bon->reference)->toStartWith('BP-')
        ->and($bon->validable_at->timestamp)->toBeGreaterThan(now()->addHours(23)->timestamp)
        ->and($res->json('data.bon.pdf_url'))->toBeNull();
});

it('refuse un montant <= 0 (422)', function () {
    $this->withHeaders($this->resAuth)->postJson('/api/portail/bons-paiement', [
        'compte_emetteur' => 'C', 'beneficiaire' => 'B', 'montant' => 0, 'motif' => 'M',
    ])->assertStatus(422)->assertJsonValidationErrors(['montant']);
});

it('le résident ne voit que ses propres bons (historique)', function () {
    creerBon();
    $this->withHeaders($this->resAuth)->getJson('/api/portail/bons-paiement')
        ->assertStatus(200)
        ->assertJsonCount(1, 'data.bons')
        ->assertJsonPath('data.bons.0.reference', BonPaiement::first()->reference);
});

it('le gestionnaire NE PEUT PAS valider avant le délai de 24 h (422)', function () {
    $bon = creerBon(['validable_at' => now()->addHours(24)]);

    $this->withHeaders($this->gestAuth)->postJson("/api/gestionnaire/bons-paiement/{$bon->id}/valider")
        ->assertStatus(422);

    expect($bon->fresh()->statut)->toBe('en_attente');
    Queue::assertNotPushed(GenerateBonPaiementPdfJob::class);
});

it('le gestionnaire valide après 24 h → statut valide + ticket de suivi + PDF (job) + notif', function () {
    $bon = creerBon(['validable_at' => now()->subHour()]); // délai écoulé

    $this->withHeaders($this->gestAuth)->postJson("/api/gestionnaire/bons-paiement/{$bon->id}/valider")
        ->assertStatus(200)
        ->assertJsonPath('data.bon.statut', 'valide');

    $bon->refresh();
    expect($bon->statut)->toBe('valide')
        ->and($bon->validated_at)->not->toBeNull()
        ->and($bon->valide_par)->toBe($this->manager->id)
        ->and($bon->ticket_id)->not->toBeNull();

    // Ticket de suivi créé, accessible au résident (user_id).
    $ticket = Ticket::find($bon->ticket_id);
    expect($ticket->user_id)->toBe($this->resident->id)
        ->and($ticket->reference)->toStartWith('TKT-');

    Queue::assertPushed(GenerateBonPaiementPdfJob::class, 1);
    Queue::assertPushed(SendNativePushJob::class); // notification résident
});

it('le PDF du bon : 404 tant que non validé, téléchargeable après génération', function () {
    Storage::fake('public');
    $bon = creerBon(['validable_at' => now()->subHour()]);

    // Avant validation → indisponible.
    $this->withHeaders($this->resAuth)->getJson("/api/portail/bons-paiement/{$bon->id}/pdf")
        ->assertStatus(404);

    // Validation + génération du PDF (le flux HTTP /valider est couvert par un
    // autre test ; ici on isole le téléchargement résident).
    $bon->update(['statut' => 'valide', 'validated_at' => now(), 'valide_par' => $this->manager->id]);
    (new GenerateBonPaiementPdfJob($bon->id))->handle();

    $bon->refresh();
    expect($bon->pdf_path)->not->toBeNull();
    Storage::disk('public')->assertExists($bon->pdf_path);

    $this->withHeaders($this->resAuth)->getJson("/api/portail/bons-paiement/{$bon->id}/pdf")
        ->assertStatus(200)
        ->assertHeader('content-type', 'application/pdf');
});

it('le gestionnaire rejette un bon → statut rejete + motif', function () {
    $bon = creerBon();

    $this->withHeaders($this->gestAuth)->postJson("/api/gestionnaire/bons-paiement/{$bon->id}/rejeter", [
        'motif' => 'Bénéficiaire incorrect',
    ])->assertStatus(200);

    $bon->refresh();
    expect($bon->statut)->toBe('rejete')
        ->and($bon->motif_rejet)->toBe('Bénéficiaire incorrect');
});

it('un résident ne peut pas accéder au bon d\'un autre copropriétaire (403)', function () {
    $autre = User::create(['tenant_id' => $this->tenant->id, 'name' => 'Autre', 'phone' => '+212622222222', 'role' => 'resident', 'status' => 'active', 'password' => bcrypt('x')]);
    $autre->assignRole('resident');
    $autreLot = Lot::withoutGlobalScope('tenant')->create(['tenant_id' => $this->tenant->id, 'residence_id' => $this->residence->id, 'immeuble_id' => Immeuble::withoutGlobalScope('tenant')->first()->id, 'numero' => 'A2', 'type' => 'appartement', 'etage' => 1, 'tantieme' => 0]);
    Coproprietaire::create(['tenant_id' => $this->tenant->id, 'user_id' => $autre->id, 'lot_id' => $autreLot->id, 'type' => 'proprietaire', 'solde_actuel' => 0]);
    $autreAuth = ['Authorization' => 'Bearer '.$autre->createToken('t')->plainTextToken];

    $bon = creerBon(); // appartient au résident principal

    $this->withHeaders($autreAuth)->getJson("/api/portail/bons-paiement/{$bon->id}")
        ->assertStatus(403);
});
