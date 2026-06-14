<?php

use App\Jobs\SendAssistanceRecouvrementEmailJob;
use App\Models\AssistanceRequest;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Queue;
use Spatie\Permission\Models\Role;

uses(RefreshDatabase::class);

beforeEach(function () {
    Queue::fake();
    foreach (['manager', 'gestionnaire'] as $r) {
        Role::firstOrCreate(['name' => $r, 'guard_name' => 'web']);
    }

    $this->tenant = Tenant::create(['name' => 'T', 'email' => 't@t.ma', 'subdomain' => 't', 'plan' => 'starter', 'status' => 'active']);
    config(['app.tenant_id' => $this->tenant->id]);

    $this->gest = User::create(['tenant_id' => $this->tenant->id, 'name' => 'Gest', 'phone' => '+212600000001', 'role' => 'gestionnaire', 'status' => 'active']);
    $this->gest->assignRole('gestionnaire');
    $this->auth = ['Authorization' => 'Bearer '.$this->gest->createToken('t')->plainTextToken];

    $this->payload = [
        'contactName' => 'Mohammed Fikri', 'contactPhone' => '+212600000001',
        'contactEmail' => 'fikri@syndic.ma', 'syndicName' => 'Gest Syndic SARL',
        'residencesCount' => '3', 'impayesEstimate' => '50000', 'plan' => 'complet',
        'message' => 'Besoin d\'accompagnement amiable.',
    ];
});

it('crée une demande, persiste et renvoie une référence AR-XXXXXX', function () {
    $res = $this->withHeaders($this->auth)
        ->postJson('/api/gestionnaire/assistance-recouvrement', $this->payload)
        ->assertStatus(201)
        ->assertJsonPath('status', 'success');

    $ref = $res->json('data.reference');
    expect($ref)->toMatch('/^AR-[A-Z0-9]{6}$/');

    $row = AssistanceRequest::where('reference', $ref)->first();
    expect($row)->not->toBeNull()
        ->and($row->plan)->toBe('complet')
        ->and($row->syndic_name)->toBe('Gest Syndic SARL')
        ->and($row->statut)->toBe('nouvelle')
        ->and($row->tenant_id)->toBe($this->tenant->id)
        ->and($row->created_by)->toBe($this->gest->id);
});

it('déclenche l\'email IT en asynchrone', function () {
    $this->withHeaders($this->auth)
        ->postJson('/api/gestionnaire/assistance-recouvrement', $this->payload)
        ->assertStatus(201);

    Queue::assertPushed(SendAssistanceRecouvrementEmailJob::class);
});

it('valide le plan (422 sur valeur invalide)', function () {
    $this->withHeaders($this->auth)
        ->postJson('/api/gestionnaire/assistance-recouvrement', [...$this->payload, 'plan' => 'gratuit'])
        ->assertStatus(422)
        ->assertJsonPath('errors.plan.0', fn ($m) => is_string($m));
});

it('exige les champs de contact (422)', function () {
    $this->withHeaders($this->auth)
        ->postJson('/api/gestionnaire/assistance-recouvrement', ['plan' => 'essentiel'])
        ->assertStatus(422);
});
