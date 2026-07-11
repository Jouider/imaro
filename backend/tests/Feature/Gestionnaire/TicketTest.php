<?php

use App\Models\Residence;
use App\Models\Tenant;
use App\Models\Ticket;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Queue;
use Spatie\Permission\Models\Role;

uses(RefreshDatabase::class);

beforeEach(function () {
    // Comme en prod (queue redis) : les push natifs déclenchés par clos/update
    // ne tournent pas inline (évite le listener tenant-aware Spatie en sync).
    Queue::fake();

    foreach (['super_admin', 'manager', 'gestionnaire', 'agent_recouvrement', 'conseil', 'resident'] as $role) {
        Role::firstOrCreate(['name' => $role, 'guard_name' => 'web']);
    }

    $this->tenant = Tenant::create([
        'name' => 'Test Syndic', 'email' => 'test@syndic.ma',
        'subdomain' => 'test', 'plan' => 'starter', 'status' => 'active',
    ]);
    config(['app.tenant_id' => $this->tenant->id]);

    $this->gestionnaire = User::create([
        'tenant_id' => $this->tenant->id, 'name' => 'Karim Gestionnaire',
        'phone' => '+212611000001', 'role' => 'gestionnaire', 'status' => 'active',
    ]);
    $this->gestionnaire->assignRole('gestionnaire');

    $this->residence = Residence::withoutGlobalScopes()->create([
        'tenant_id' => $this->tenant->id, 'gestionnaire_id' => $this->gestionnaire->id,
        'name' => 'Résidence Test', 'address' => 'Rue A', 'city' => 'Casa',
        'total_tantieme' => 1000, 'nb_lots' => 0, 'status' => 'active',
    ]);

    $this->token = $this->gestionnaire->createToken('test')->plainTextToken;
});

it('creates a ticket', function () {
    $this->withHeaders(['Authorization' => "Bearer {$this->token}"])
        ->postJson('/api/gestionnaire/tickets', [
            'residence_id' => $this->residence->id,
            'categorie'    => 'ascenseur',
            'description'  => 'Ascenseur en panne bloc A depuis 2 jours',
            'priorite'     => 'urgent',
        ])
        ->assertStatus(201)
        ->assertJsonPath('data.ticket.categorie', 'ascenseur')
        ->assertJsonPath('data.ticket.statut', 'ouvert');
});

it('lists tickets for gestionnaire residences', function () {
    Ticket::create([
        'tenant_id' => $this->tenant->id, 'residence_id' => $this->residence->id,
        'user_id' => $this->gestionnaire->id, 'categorie' => 'plomberie',
        'description' => 'Fuite eau couloir commun', 'priorite' => 'normal', 'statut' => 'ouvert',
    ]);

    $this->withHeaders(['Authorization' => "Bearer {$this->token}"])
        ->getJson('/api/gestionnaire/tickets')
        ->assertStatus(200)
        ->assertJsonPath('data.meta.total', 1);
});

it('filters tickets by statut', function () {
    Ticket::create(['tenant_id' => $this->tenant->id, 'residence_id' => $this->residence->id, 'user_id' => $this->gestionnaire->id, 'categorie' => 'autre', 'description' => 'Ticket ouvert description longue', 'priorite' => 'normal', 'statut' => 'ouvert']);
    Ticket::create(['tenant_id' => $this->tenant->id, 'residence_id' => $this->residence->id, 'user_id' => $this->gestionnaire->id, 'categorie' => 'autre', 'description' => 'Ticket resolu description longue', 'priorite' => 'faible', 'statut' => 'resolu']);

    $response = $this->withHeaders(['Authorization' => "Bearer {$this->token}"])
        ->getJson('/api/gestionnaire/tickets?statut=ouvert')
        ->assertStatus(200);

    expect($response->json('data.meta.total'))->toBe(1);
});

it('shows ticket detail', function () {
    $ticket = Ticket::create([
        'tenant_id' => $this->tenant->id, 'residence_id' => $this->residence->id,
        'user_id' => $this->gestionnaire->id, 'categorie' => 'electricite',
        'description' => 'Panne électrique cage escalier B', 'priorite' => 'urgent', 'statut' => 'ouvert',
    ]);

    $this->withHeaders(['Authorization' => "Bearer {$this->token}"])
        ->getJson("/api/gestionnaire/tickets/{$ticket->id}")
        ->assertStatus(200)
        ->assertJsonPath('data.ticket.categorie', 'electricite');
});

it('updates ticket statut to en_cours', function () {
    $ticket = Ticket::create([
        'tenant_id' => $this->tenant->id, 'residence_id' => $this->residence->id,
        'user_id' => $this->gestionnaire->id, 'categorie' => 'proprete',
        'description' => 'Nettoyage couloir nécessaire urgent', 'priorite' => 'normal', 'statut' => 'ouvert',
    ]);

    $this->withHeaders(['Authorization' => "Bearer {$this->token}"])
        ->putJson("/api/gestionnaire/tickets/{$ticket->id}", ['statut' => 'en_cours'])
        ->assertStatus(200)
        ->assertJsonPath('data.ticket.statut', 'en_cours');
});

it('closes a ticket and sets closed_at', function () {
    $ticket = Ticket::create([
        'tenant_id' => $this->tenant->id, 'residence_id' => $this->residence->id,
        'user_id' => $this->gestionnaire->id, 'categorie' => 'securite',
        'description' => 'Porte entrée principale ne ferme plus', 'priorite' => 'urgent', 'statut' => 'resolu',
    ]);

    $this->withHeaders(['Authorization' => "Bearer {$this->token}"])
        ->postJson("/api/gestionnaire/tickets/{$ticket->id}/clos")
        ->assertStatus(200)
        ->assertJsonPath('data.ticket.statut', 'clos');

    expect($ticket->fresh()->closed_at)->not->toBeNull();
});

it('accepts the extended KAN-55 categories (e.g. chauffage)', function () {
    $this->withHeaders(['Authorization' => "Bearer {$this->token}"])
        ->postJson('/api/gestionnaire/tickets', [
            'residence_id' => $this->residence->id,
            'categorie'    => 'chauffage',
            'description'  => 'Chauffage collectif en panne au bloc B',
            'priorite'     => 'normal',
        ])
        ->assertStatus(201)
        ->assertJsonPath('data.ticket.categorie', 'chauffage');
});

it('rejects an unknown category', function () {
    $this->withHeaders(['Authorization' => "Bearer {$this->token}"])
        ->postJson('/api/gestionnaire/tickets', [
            'residence_id' => $this->residence->id,
            'categorie'    => 'inexistante',
            'description'  => 'Description suffisamment longue pour passer',
            'priorite'     => 'normal',
        ])
        ->assertStatus(422)
        ->assertJsonValidationErrors('categorie');
});

it('returns 422 when closing an already closed ticket', function () {
    $ticket = Ticket::create([
        'tenant_id' => $this->tenant->id, 'residence_id' => $this->residence->id,
        'user_id' => $this->gestionnaire->id, 'categorie' => 'autre',
        'description' => 'Ticket déjà clos depuis longtemps', 'priorite' => 'faible', 'statut' => 'clos',
        'closed_at' => now(),
    ]);

    $this->withHeaders(['Authorization' => "Bearer {$this->token}"])
        ->postJson("/api/gestionnaire/tickets/{$ticket->id}/clos")
        ->assertStatus(422);
});
