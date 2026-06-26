<?php

/**
 * KAN-53 / KAN-107 — assistant EMARO chat (POST /api/ia/chat).
 */

use App\Models\Residence;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Spatie\Permission\Models\Role;

uses(RefreshDatabase::class);

beforeEach(function () {
    foreach (['manager', 'gestionnaire'] as $r) {
        Role::firstOrCreate(['name' => $r, 'guard_name' => 'web']);
    }

    $this->tenant = Tenant::create(['name' => 'T', 'email' => 't@t.ma', 'subdomain' => 't', 'plan' => 'business', 'status' => 'active']);
    config(['app.tenant_id' => $this->tenant->id]);

    $this->manager = User::create(['tenant_id' => $this->tenant->id, 'name' => 'Fikri', 'phone' => '+212600000001', 'role' => 'manager', 'status' => 'active']);
    $this->manager->assignRole('manager');

    $this->residence = Residence::withoutGlobalScope('tenant')->create([
        'tenant_id' => $this->tenant->id, 'gestionnaire_id' => $this->manager->id, 'name' => 'Atlas',
        'address' => 'X', 'city' => 'Casa', 'total_tantieme' => 1000, 'nb_lots' => 0, 'status' => 'active',
    ]);

    $this->auth = ['Authorization' => 'Bearer '.$this->manager->createToken('t')->plainTextToken];
});

function ask($test, string $content, array $extra = [])
{
    return $test->withHeaders($test->auth)->postJson('/api/ia/chat', array_merge([
        'messages' => [['role' => 'user', 'content' => $content]],
        'language' => 'fr',
    ], $extra));
}

it('répond à une question clé par une réponse figée + citation (sans clé IA)', function () {
    config(['services.anthropic.key' => null]);

    $res = ask($this, 'Quel est le délai légal de convocation d\'une AG ?')->assertStatus(200);

    expect($res->json('data.content'))->toContain('15 jours');
    expect($res->json('data.citations.0.loi'))->toBe('Loi 18-00');
});

it('détecte le sujet par mots-clés même reformulé', function () {
    config(['services.anthropic.key' => null]);

    $res = ask($this, 'comment je calcule les penalites quand un copro paie en retard ?')->assertStatus(200);
    expect($res->json('data.content'))->toContain('art. 25');
});

it('renvoie un message d\'aide si free-form et pas de clé IA', function () {
    config(['services.anthropic.key' => null]);

    $res = ask($this, 'Bonjour, peux-tu me parler de la météo ?')->assertStatus(200);
    expect($res->json('data.content'))->toContain('sujets clés')
        ->and($res->json('data.citations'))->toBeNull();
});

it('passe par Claude pour le free-form si une clé est configurée', function () {
    config(['services.anthropic.key' => 'sk-test', 'services.anthropic.model' => 'claude-haiku-4-5-20251001']);
    Http::fake([
        'api.anthropic.com/*' => Http::response(['content' => [['type' => 'text', 'text' => 'Réponse IA personnalisée.']]], 200),
    ]);

    $res = ask($this, 'Question libre hors sujet clé')->assertStatus(200);
    expect($res->json('data.content'))->toBe('Réponse IA personnalisée.');
    Http::assertSent(fn ($req) => str_contains($req->url(), 'api.anthropic.com'));
});

it('valide le corps (messages requis)', function () {
    $this->withHeaders($this->auth)->postJson('/api/ia/chat', ['language' => 'fr'])
        ->assertStatus(422)->assertJsonValidationErrors('messages');
});
