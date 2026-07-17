<?php

/**
 * KAN-107 — assistant EMARO : réponses aux 4 questions clés (système + Loi 18-00).
 */

use App\Models\Assemblee;
use App\Models\PenaltyConfig;
use App\Models\Residence;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Role;

uses(RefreshDatabase::class);

beforeEach(function () {
    foreach (['manager', 'gestionnaire'] as $r) {
        Role::firstOrCreate(['name' => $r, 'guard_name' => 'web']);
    }

    $this->tenant = Tenant::create(['name' => 'T', 'email' => 't@t.ma', 'subdomain' => 't', 'plan' => 'business', 'status' => 'active']);
    config(['app.tenant_id' => $this->tenant->id]);
    // KAN-111 — l'IA est désactivée par défaut ; ce test valide le service quand elle est active.
    config(['features.ia' => true]);

    $this->manager = User::create(['tenant_id' => $this->tenant->id, 'name' => 'Fikri', 'phone' => '+212600000001', 'role' => 'manager', 'status' => 'active']);
    $this->manager->assignRole('manager');

    $this->residence = Residence::withoutGlobalScope('tenant')->create([
        'tenant_id' => $this->tenant->id, 'gestionnaire_id' => $this->manager->id, 'name' => 'Atlas',
        'address' => 'X', 'city' => 'Casa', 'total_tantieme' => 1000, 'nb_lots' => 0, 'status' => 'active',
    ]);

    $this->auth = ['Authorization' => 'Bearer '.$this->manager->createToken('t')->plainTextToken];
});

it('renvoie les 4 questions clés avec leurs réponses', function () {
    $res = $this->withHeaders($this->auth)->getJson('/api/gestionnaire/assistant/faq')
        ->assertStatus(200)
        ->assertJsonCount(4, 'data.questions')
        ->assertJsonPath('data.questions.0.key', 'penalites_retard');

    $keys = collect($res->json('data.questions'))->pluck('key');
    expect($keys->all())->toBe(['penalites_retard', 'annexes', 'delai_convocation_ag', 'cloture_exercice']);

    // Références légales présentes + délai AG correct dans la réponse #3.
    expect($res->json('data.questions.2.answer'))->toContain('15 jours')
        ->and($res->json('data.questions.2.refs'))->toContain('Loi 18-00 art. 16quinquies');
});

it('enrichit la réponse pénalités avec la config réelle de la résidence', function () {
    PenaltyConfig::create([
        'residence_id' => $this->residence->id, 'enabled' => true,
        'grace_period_days' => 20, 'rate_type' => 'percentage', 'rate_value' => 7.5,
    ]);

    $res = $this->withHeaders($this->auth)
        ->getJson("/api/gestionnaire/assistant/faq?residence_id={$this->residence->id}")
        ->assertStatus(200);

    $penalites = $res->json('data.questions.0.answer');
    expect($penalites)->toContain('20 jours')->toContain('7,5 %');
});

it('signale que les pénalités ne sont pas activées si pas de config', function () {
    $res = $this->withHeaders($this->auth)
        ->getJson("/api/gestionnaire/assistant/faq?residence_id={$this->residence->id}")
        ->assertStatus(200);

    expect($res->json('data.questions.0.answer'))->toContain('ne sont pas encore activées');
});

it('enrichit la réponse AG avec la prochaine assemblée', function () {
    Assemblee::create([
        'tenant_id' => $this->tenant->id, 'residence_id' => $this->residence->id, 'created_by' => $this->manager->id,
        'titre' => 'AG 2026', 'type' => 'ordinaire', 'date' => now()->addDays(30)->toDateString(),
        'lieu' => 'Salle', 'quorum_requis' => 50, 'ordre_du_jour' => 'Comptes', 'statut' => 'planifiee',
    ]);

    $res = $this->withHeaders($this->auth)
        ->getJson("/api/gestionnaire/assistant/faq?residence_id={$this->residence->id}")
        ->assertStatus(200);

    expect($res->json('data.questions.2.answer'))->toContain('AG 2026')->toContain('Prochaine AG');
});

it('refuse (403) une résidence d\'un autre gestionnaire', function () {
    $autre = User::create(['tenant_id' => $this->tenant->id, 'name' => 'Autre', 'phone' => '+212699998877', 'role' => 'gestionnaire', 'status' => 'active']);
    $autre->assignRole('gestionnaire');
    $auth = ['Authorization' => 'Bearer '.$autre->createToken('t')->plainTextToken];

    $this->withHeaders($auth)
        ->getJson("/api/gestionnaire/assistant/faq?residence_id={$this->residence->id}")
        ->assertStatus(403);
});
