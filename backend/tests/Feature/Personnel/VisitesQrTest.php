<?php

/**
 * KAN-102 — visiteurs attendus + scan QR par l'agent de sécurité.
 */

use App\Models\Coproprietaire;
use App\Models\Immeuble;
use App\Models\Lot;
use App\Models\PersonnelResidence;
use App\Models\Residence;
use App\Models\Tenant;
use App\Models\User;
use App\Models\Visite;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Role;

uses(RefreshDatabase::class);

beforeEach(function () {
    foreach (['manager', 'gestionnaire', 'resident', 'personnel'] as $r) {
        Role::firstOrCreate(['name' => $r, 'guard_name' => 'web']);
    }

    $this->tenant = Tenant::create(['name' => 'T', 'email' => 't@t.ma', 'subdomain' => 't', 'plan' => 'business', 'status' => 'active']);
    config(['app.tenant_id' => $this->tenant->id]);

    $this->gest = User::create(['tenant_id' => $this->tenant->id, 'name' => 'Gest', 'phone' => '+212600000001', 'role' => 'gestionnaire', 'status' => 'active']);

    $this->residence = Residence::withoutGlobalScope('tenant')->create([
        'tenant_id' => $this->tenant->id, 'gestionnaire_id' => $this->gest->id, 'name' => 'Aqualina',
        'address' => 'X', 'city' => 'Casa', 'total_tantieme' => 1000, 'nb_lots' => 1, 'status' => 'active', 'mode_cotisation' => 'tantieme',
    ]);
    $imm = Immeuble::withoutGlobalScope('tenant')->create(['tenant_id' => $this->tenant->id, 'residence_id' => $this->residence->id, 'nom' => 'A', 'nb_etages' => 1, 'nb_lots' => 1]);
    $this->lot = Lot::withoutGlobalScope('tenant')->create(['tenant_id' => $this->tenant->id, 'residence_id' => $this->residence->id, 'immeuble_id' => $imm->id, 'numero' => 'A12', 'type' => 'appartement', 'etage' => 1, 'tantieme' => 1000]);

    $this->resident = User::create(['tenant_id' => $this->tenant->id, 'name' => 'Hassan Benali', 'phone' => '+212611111111', 'role' => 'resident', 'status' => 'active', 'password' => bcrypt('x')]);
    $this->resident->assignRole('resident');
    $this->copro = Coproprietaire::create(['tenant_id' => $this->tenant->id, 'user_id' => $this->resident->id, 'lot_id' => $this->lot->id, 'type' => 'proprietaire', 'solde_actuel' => 0]);

    // Agent de sécurité (personnel) rattaché à la résidence.
    $this->agent = User::create(['tenant_id' => $this->tenant->id, 'name' => 'Said Gardien', 'phone' => '+212622222222', 'role' => 'personnel', 'status' => 'active']);
    $this->agent->assignRole('personnel');
    PersonnelResidence::create(['tenant_id' => $this->tenant->id, 'name' => 'Said Gardien', 'poste' => 'securite', 'residence_id' => $this->residence->id, 'user_id' => $this->agent->id, 'phone' => '+212622222222', 'is_active' => true]);

    $this->resAuth = ['Authorization' => 'Bearer '.$this->resident->createToken('t')->plainTextToken];
    $this->agentAuth = ['Authorization' => 'Bearer '.$this->agent->createToken('t')->plainTextToken];
});

/** Helper : déclare une visite directement (sans passer par l'endpoint). */
function makeVisite($test, array $attrs = []): Visite
{
    return Visite::create(array_merge([
        'tenant_id' => $test->tenant->id,
        'residence_id' => $test->residence->id,
        'lot_id' => $test->lot->id,
        'coproprietaire_id' => $test->copro->id,
        'declarant_user_id' => $test->resident->id,
        'resident_nom' => $test->resident->name,
        'lot_numero' => $test->lot->numero,
        'visiteur_nom' => 'Karim Livreur',
        'motif' => 'Livraison',
        'date_visite' => now()->toDateString(),
        'qr_token' => Visite::generateToken(),
        'statut' => 'attendu',
    ], $attrs));
}

// ── Résident : déclaration ───────────────────────────────────────────────────

it('le résident déclare un visiteur attendu → 201 + qr_token', function () {
    $res = $this->withHeaders($this->resAuth)->postJson('/api/portail/visites', [
        'visiteur_nom' => 'Karim Livreur', 'motif' => 'Livraison', 'date_visite' => now()->toDateString(),
    ])->assertStatus(201)
        ->assertJsonPath('data.visite.visiteur_nom', 'Karim Livreur')
        ->assertJsonPath('data.visite.statut', 'attendu');

    expect($res->json('data.visite.qr_token'))->toBeString()->toHaveLength(40);
    expect(Visite::where('coproprietaire_id', $this->copro->id)->count())->toBe(1);
});

it('rejette (422) une déclaration sans nom de visiteur', function () {
    $this->withHeaders($this->resAuth)->postJson('/api/portail/visites', [
        'motif' => 'Livraison',
    ])->assertStatus(422)->assertJsonValidationErrors('visiteur_nom');
});

it('rejette (422) une date de visite dans le passé', function () {
    $this->withHeaders($this->resAuth)->postJson('/api/portail/visites', [
        'visiteur_nom' => 'Karim', 'date_visite' => now()->subDay()->toDateString(),
    ])->assertStatus(422)->assertJsonValidationErrors('date_visite');
});

it('le résident liste ses visites et peut en annuler une non scannée', function () {
    $v = makeVisite($this);

    $this->withHeaders($this->resAuth)->getJson('/api/portail/visites')
        ->assertStatus(200)
        ->assertJsonPath('data.visites.0.id', $v->id);

    $this->withHeaders($this->resAuth)->deleteJson("/api/portail/visites/{$v->id}")
        ->assertStatus(200);

    expect($v->fresh()->statut)->toBe('annule');
});

// ── Agent : scan ─────────────────────────────────────────────────────────────

it('l\'agent scanne un visiteur attendu → 200 attendu + marque scanné', function () {
    $v = makeVisite($this);

    $this->withHeaders($this->agentAuth)->postJson('/api/personnel/visites/scan', ['qr_token' => $v->qr_token])
        ->assertStatus(200)
        ->assertJsonPath('data.statut', 'attendu')
        ->assertJsonPath('data.resident_nom', 'Hassan Benali')
        ->assertJsonPath('data.lot', 'A12')
        ->assertJsonPath('data.motif', 'Livraison');

    $v->refresh();
    expect($v->statut)->toBe('scanne')
        ->and($v->scanned_by)->toBe($this->agent->id)
        ->and($v->scanned_at)->not->toBeNull();
});

it('un second scan du même QR → 409', function () {
    $v = makeVisite($this, ['statut' => 'scanne', 'scanned_at' => now(), 'scanned_by' => $this->agent->id]);

    $this->withHeaders($this->agentAuth)->postJson('/api/personnel/visites/scan', ['qr_token' => $v->qr_token])
        ->assertStatus(409)
        ->assertJsonPath('data.visite_id', $v->id);
});

it('un token inconnu → 404', function () {
    $this->withHeaders($this->agentAuth)->postJson('/api/personnel/visites/scan', ['qr_token' => 'inexistant-token'])
        ->assertStatus(404);
});

it('un visiteur annulé → 200 non_attendu, sans marquer scanné', function () {
    $v = makeVisite($this, ['statut' => 'annule']);

    $this->withHeaders($this->agentAuth)->postJson('/api/personnel/visites/scan', ['qr_token' => $v->qr_token])
        ->assertStatus(200)
        ->assertJsonPath('data.statut', 'non_attendu');

    expect($v->fresh()->statut)->toBe('annule');
});

it('une visite périmée (date passée) → 200 non_attendu', function () {
    $v = makeVisite($this, ['date_visite' => now()->subDays(2)->toDateString()]);

    $this->withHeaders($this->agentAuth)->postJson('/api/personnel/visites/scan', ['qr_token' => $v->qr_token])
        ->assertStatus(200)
        ->assertJsonPath('data.statut', 'non_attendu');
});

it('l\'agent voit les visites attendues du jour de sa résidence', function () {
    makeVisite($this, ['visiteur_nom' => 'Aujourd\'hui']);
    makeVisite($this, ['visiteur_nom' => 'Demain', 'date_visite' => now()->addDay()->toDateString()]);

    $res = $this->withHeaders($this->agentAuth)->getJson('/api/personnel/visites')
        ->assertStatus(200);

    expect($res->json('data.visites'))->toHaveCount(1)
        ->and($res->json('data.visites.0.visiteur_nom'))->toBe('Aujourd\'hui');
});

it('un résident ne peut pas accéder à l\'endpoint agent (403)', function () {
    $this->withHeaders($this->resAuth)->postJson('/api/personnel/visites/scan', ['qr_token' => 'x'])
        ->assertStatus(403);
});
