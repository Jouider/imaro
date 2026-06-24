<?php

/**
 * KAN-102 (réalignement brief) — Visites : laissez-passer QR + cycle de scan.
 * Contrat = docs/feature-visites-backend-brief.md (frontend visites.service.ts).
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

    $this->manager = User::create(['tenant_id' => $this->tenant->id, 'name' => 'Fikri', 'phone' => '+212600000001', 'email' => 'm@t.ma', 'role' => 'manager', 'status' => 'active']);
    $this->manager->assignRole('manager');

    $this->residence = Residence::withoutGlobalScope('tenant')->create([
        'tenant_id' => $this->tenant->id, 'gestionnaire_id' => $this->manager->id, 'name' => 'Aqualina',
        'address' => 'X', 'city' => 'Casa', 'total_tantieme' => 1000, 'nb_lots' => 1, 'status' => 'active', 'mode_cotisation' => 'tantieme',
    ]);
    $imm = Immeuble::withoutGlobalScope('tenant')->create(['tenant_id' => $this->tenant->id, 'residence_id' => $this->residence->id, 'nom' => 'A', 'nb_etages' => 1, 'nb_lots' => 1]);
    $this->lot = Lot::withoutGlobalScope('tenant')->create(['tenant_id' => $this->tenant->id, 'residence_id' => $this->residence->id, 'immeuble_id' => $imm->id, 'numero' => 'A12', 'type' => 'appartement', 'etage' => 1, 'tantieme' => 1000]);

    $this->resident = User::create(['tenant_id' => $this->tenant->id, 'name' => 'Hassan Benali', 'phone' => '+212611111111', 'role' => 'resident', 'status' => 'active', 'password' => bcrypt('x')]);
    $this->resident->assignRole('resident');
    $this->copro = Coproprietaire::create(['tenant_id' => $this->tenant->id, 'user_id' => $this->resident->id, 'lot_id' => $this->lot->id, 'type' => 'proprietaire', 'solde_actuel' => 0]);

    // Gardien = personnel (poste sécurité), login phone+code, rattaché à la résidence.
    $this->agent = User::create(['tenant_id' => $this->tenant->id, 'name' => 'Said Gardien', 'phone' => '+212622222222', 'role' => 'personnel', 'status' => 'active']);
    $this->agent->assignRole('personnel');
    PersonnelResidence::create(['tenant_id' => $this->tenant->id, 'name' => 'Said Gardien', 'poste' => 'securite', 'residence_id' => $this->residence->id, 'user_id' => $this->agent->id, 'phone' => '+212622222222', 'is_active' => true]);

    $this->mgrAuth = ['Authorization' => 'Bearer '.$this->manager->createToken('t')->plainTextToken];
    $this->resAuth = ['Authorization' => 'Bearer '.$this->resident->createToken('t')->plainTextToken];
    $this->agentAuth = ['Authorization' => 'Bearer '.$this->agent->createToken('t')->plainTextToken];
});

function makeVisite($test, array $attrs = []): Visite
{
    return Visite::create(array_merge([
        'tenant_id' => $test->tenant->id,
        'residence_id' => $test->residence->id,
        'qr_token' => Visite::generateToken(),
        'visitor_name' => 'Karim Livreur',
        'visitor_phone' => '+212655555555',
        'type' => 'delivery',
        'host_lot_id' => $test->lot->id,
        'host_user_id' => $test->resident->id,
        'planned_at' => now(),
        'status' => 'planned',
        'created_by_id' => $test->resident->id,
    ], $attrs));
}

// ── Gestionnaire CRUD + stats ────────────────────────────────────────────────

it('gestionnaire crée une visite (status planned) → 201, shape frontend', function () {
    $this->withHeaders($this->mgrAuth)
        ->postJson("/api/gestionnaire/residences/{$this->residence->id}/visites", [
            'visitor_name' => 'Yassine Berrada', 'visitor_phone' => '+212611223344',
            'type' => 'visitor', 'purpose' => 'RDV', 'host_lot_id' => $this->lot->id,
            'planned_at' => now()->addHours(3)->toIso8601String(),
        ])
        ->assertStatus(201)
        ->assertJsonPath('data.visitor_name', 'Yassine Berrada')
        ->assertJsonPath('data.status', 'planned')
        ->assertJsonPath('data.host_lot_numero', 'A12')
        ->assertJsonStructure(['data' => ['id', 'qr_token', 'visitor_name', 'status', 'planned_at', 'created_by_name']]);
});

it('gestionnaire sans planned_at → walk-in (status arrived)', function () {
    $this->withHeaders($this->mgrAuth)
        ->postJson("/api/gestionnaire/residences/{$this->residence->id}/visites", [
            'visitor_name' => 'Glovo', 'visitor_phone' => '+212600000000', 'type' => 'delivery',
        ])
        ->assertStatus(201)
        ->assertJsonPath('data.status', 'arrived');
});

it('liste des visites = tableau direct dans data (shape attendu par le front)', function () {
    makeVisite($this);

    $this->withHeaders($this->mgrAuth)
        ->getJson("/api/gestionnaire/residences/{$this->residence->id}/visites")
        ->assertStatus(200)
        ->assertJsonPath('data.0.visitor_name', 'Karim Livreur')
        ->assertJsonPath('data.0.status', 'planned');
});

it('stats renvoie les KPIs', function () {
    makeVisite($this, ['status' => 'arrived', 'arrived_at' => now()]);
    makeVisite($this, ['status' => 'planned', 'planned_at' => now()->addDay()]);

    $this->withHeaders($this->mgrAuth)
        ->getJson("/api/gestionnaire/residences/{$this->residence->id}/visites/stats")
        ->assertStatus(200)
        ->assertJsonPath('data.currently_inside', 1)
        ->assertJsonPath('data.planned', 1)
        ->assertJsonStructure(['data' => ['today', 'currently_inside', 'planned', 'expired_today']]);
});

it('annule une visite planifiée', function () {
    $v = makeVisite($this);
    $this->withHeaders($this->mgrAuth)->postJson("/api/gestionnaire/visites/{$v->id}/cancel")
        ->assertStatus(200)->assertJsonPath('data.status', 'cancelled');
});

// ── Scan (check-in / check-out / rejected) ───────────────────────────────────

it('scan d\'une visite planifiée dans la fenêtre → check_in', function () {
    $v = makeVisite($this, ['planned_at' => now()]);

    $this->withHeaders($this->agentAuth)->postJson('/api/visites/scan', ['token' => $v->qr_token])
        ->assertStatus(200)
        ->assertJsonPath('data.action', 'check_in')
        ->assertJsonPath('data.visit.status', 'arrived');

    expect($v->fresh()->arrived_at)->not->toBeNull();
});

it('scan d\'une visite arrived → check_out', function () {
    $v = makeVisite($this, ['status' => 'arrived', 'arrived_at' => now()->subHour()]);

    $this->withHeaders($this->agentAuth)->postJson('/api/visites/scan', ['token' => $v->qr_token])
        ->assertStatus(200)
        ->assertJsonPath('data.action', 'check_out')
        ->assertJsonPath('data.visit.status', 'departed');
});

it('scan trop tôt (hors fenêtre) → rejected too_early', function () {
    $v = makeVisite($this, ['planned_at' => now()->addHours(5)]);

    $this->withHeaders($this->agentAuth)->postJson('/api/visites/scan', ['token' => $v->qr_token])
        ->assertStatus(200)
        ->assertJsonPath('data.action', 'rejected')
        ->assertJsonPath('data.reason', 'too_early');
});

it('scan d\'une visite annulée → rejected cancelled', function () {
    $v = makeVisite($this, ['status' => 'cancelled']);
    $this->withHeaders($this->agentAuth)->postJson('/api/visites/scan', ['token' => $v->qr_token])
        ->assertStatus(200)->assertJsonPath('data.reason', 'cancelled');
});

it('scan token inconnu → 404', function () {
    $this->withHeaders($this->agentAuth)->postJson('/api/visites/scan', ['token' => 'vst_inconnu'])
        ->assertStatus(404);
});

it('un résident ne peut pas scanner (403)', function () {
    $v = makeVisite($this);
    $this->withHeaders($this->resAuth)->postJson('/api/visites/scan', ['token' => $v->qr_token])
        ->assertStatus(403);
});

// ── Walk-in + gardien actifs ─────────────────────────────────────────────────

it('walk-in crée une visite arrived', function () {
    $this->withHeaders($this->agentAuth)->postJson('/api/visites/walk-in', [
        'residence_id' => $this->residence->id, 'visitor_name' => 'Ad Hoc',
        'visitor_phone' => '+212699999999', 'type' => 'visitor',
    ])->assertStatus(201)->assertJsonPath('data.status', 'arrived');
});

it('gardien voit les visiteurs actuellement à l\'intérieur', function () {
    makeVisite($this, ['status' => 'arrived', 'arrived_at' => now()]);
    makeVisite($this, ['status' => 'planned']);

    $res = $this->withHeaders($this->agentAuth)->getJson('/api/gardien/visites/active')->assertStatus(200);
    expect($res->json('data'))->toHaveCount(1)
        ->and($res->json('data.0.status'))->toBe('arrived');
});

// ── Public /v/:token ─────────────────────────────────────────────────────────

it('lookup public par token → champs limités, sans auth', function () {
    $v = makeVisite($this);

    $this->getJson("/api/public/visites/{$v->qr_token}")
        ->assertStatus(200)
        ->assertJsonPath('data.visitor_name', 'Karim Livreur')
        ->assertJsonPath('data.host_lot_numero', 'A12')
        ->assertJsonMissingPath('data.visitor_phone')
        ->assertJsonMissingPath('data.id');
});

it('lookup public d\'un token annulé → 404', function () {
    $v = makeVisite($this, ['status' => 'cancelled']);
    $this->getJson("/api/public/visites/{$v->qr_token}")->assertStatus(404);
});

it('wallet public → 404 (non implémenté MVP)', function () {
    $v = makeVisite($this);
    $this->getJson("/api/public/visites/{$v->qr_token}/wallet")->assertStatus(404);
});

// ── Portail résident (invite) ────────────────────────────────────────────────

it('le résident invite un visiteur → 201, host inféré', function () {
    $this->withHeaders($this->resAuth)->postJson('/api/portail/visites', [
        'visitor_name' => 'Ahmed Ouazzani', 'visitor_phone' => '+212600112233',
        'type' => 'visitor', 'planned_at' => now()->addHours(2)->toIso8601String(),
    ])->assertStatus(201)
        ->assertJsonPath('data.visitor_name', 'Ahmed Ouazzani')
        ->assertJsonPath('data.host_lot_numero', 'A12');

    $v = Visite::where('host_user_id', $this->resident->id)->first();
    expect($v->host_lot_id)->toBe($this->lot->id);
});

it('le résident voit ses visites invitées', function () {
    makeVisite($this);
    $this->withHeaders($this->resAuth)->getJson('/api/portail/visites')
        ->assertStatus(200)->assertJsonPath('data.0.visitor_name', 'Karim Livreur');
});

// ── Cron d'expiration ────────────────────────────────────────────────────────

it('la commande visites:expire passe les planned dépassées à expired', function () {
    $old = makeVisite($this, ['planned_at' => now()->subDays(2), 'status' => 'planned']);
    $fresh = makeVisite($this, ['planned_at' => now()->addHour(), 'status' => 'planned']);

    $this->artisan('visites:expire')->assertSuccessful();

    expect($old->fresh()->status)->toBe('expired')
        ->and($fresh->fresh()->status)->toBe('planned');
});
