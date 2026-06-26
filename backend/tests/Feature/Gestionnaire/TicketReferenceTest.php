<?php

/**
 * KAN-105 — référence unique et lisible générée automatiquement par ticket.
 */

use App\Models\Residence;
use App\Models\Tenant;
use App\Models\Ticket;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Queue;
use Spatie\Permission\Models\Role;

uses(RefreshDatabase::class);

beforeEach(function () {
    Queue::fake();
    foreach (['manager', 'gestionnaire', 'resident'] as $r) {
        Role::firstOrCreate(['name' => $r, 'guard_name' => 'web']);
    }

    $this->tenant = Tenant::create(['name' => 'T', 'email' => 't@t.ma', 'subdomain' => 't', 'plan' => 'business', 'status' => 'active']);
    config(['app.tenant_id' => $this->tenant->id]);

    $this->gest = User::create(['tenant_id' => $this->tenant->id, 'name' => 'Gest', 'phone' => '+212600000001', 'role' => 'gestionnaire', 'status' => 'active']);
    $this->gest->assignRole('gestionnaire');

    $this->residence = Residence::withoutGlobalScope('tenant')->create([
        'tenant_id' => $this->tenant->id, 'gestionnaire_id' => $this->gest->id, 'name' => 'Atlas',
        'address' => 'X', 'city' => 'Casa', 'total_tantieme' => 1000, 'nb_lots' => 0, 'status' => 'active',
    ]);

    $this->auth = ['Authorization' => 'Bearer '.$this->gest->createToken('t')->plainTextToken];
});

function makeTicket($test): Ticket
{
    return Ticket::create([
        'tenant_id' => $test->tenant->id, 'residence_id' => $test->residence->id,
        'user_id' => $test->gest->id, 'categorie' => 'plomberie',
        'description' => 'Fuite couloir', 'priorite' => 'normal', 'statut' => 'ouvert',
    ]);
}

it('génère une référence TKT-{année}-{≥3 chiffres} à la création', function () {
    $t = makeTicket($this);
    expect($t->fresh()->reference)->toMatch('/^TKT-\d{4}-\d{3,}$/');
});

it('la référence est unique sur plusieurs tickets', function () {
    $a = makeTicket($this)->fresh();
    $b = makeTicket($this)->fresh();
    expect($a->reference)->not->toBe($b->reference);
});

it('expose la référence dans la réponse gestionnaire', function () {
    $t = makeTicket($this);
    $this->withHeaders($this->auth)->getJson('/api/gestionnaire/tickets')
        ->assertStatus(200)
        ->assertJsonPath('data.tickets.0.reference', $t->fresh()->reference);
});

it('permet de retrouver un ticket par sa référence (search)', function () {
    $t = makeTicket($this)->fresh();
    makeTicket($this); // bruit

    $res = $this->withHeaders($this->auth)
        ->getJson('/api/gestionnaire/tickets?search='.$t->reference)
        ->assertStatus(200);

    expect($res->json('data.meta.total'))->toBe(1)
        ->and($res->json('data.tickets.0.reference'))->toBe($t->reference);
});

it('un ticket créé via l\'endpoint a aussi une référence', function () {
    $res = $this->withHeaders($this->auth)->postJson('/api/gestionnaire/tickets', [
        'residence_id' => $this->residence->id,
        'categorie' => 'ascenseur', 'description' => 'Ascenseur en panne bloc A depuis ce matin', 'priorite' => 'urgent',
    ])->assertStatus(201);

    $id = $res->json('data.ticket.id');
    expect(Ticket::find($id)->reference)->toMatch('/^TKT-\d{4}-\d{3,}$/');
});
