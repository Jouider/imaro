<?php

/**
 * KAN-88 — assignation d'un ticket à un gestionnaire (+ inbox + notif).
 */

use App\Models\Notification;
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

    $this->manager = User::create(['tenant_id' => $this->tenant->id, 'name' => 'Fikri', 'phone' => '+212600000001', 'role' => 'manager', 'status' => 'active']);
    $this->manager->assignRole('manager');

    $this->gest = User::create(['tenant_id' => $this->tenant->id, 'name' => 'Karim', 'phone' => '+212600000002', 'role' => 'gestionnaire', 'status' => 'active']);
    $this->gest->assignRole('gestionnaire');

    $this->residence = Residence::withoutGlobalScope('tenant')->create([
        'tenant_id' => $this->tenant->id, 'gestionnaire_id' => $this->gest->id, 'name' => 'Atlas',
        'address' => 'X', 'city' => 'Casa', 'total_tantieme' => 1000, 'nb_lots' => 0, 'status' => 'active',
    ]);

    $this->ticket = Ticket::create([
        'tenant_id' => $this->tenant->id, 'residence_id' => $this->residence->id, 'user_id' => $this->manager->id,
        'categorie' => 'plomberie', 'description' => 'Fuite couloir commun', 'priorite' => 'normal', 'statut' => 'ouvert',
    ]);

    $this->auth = ['Authorization' => 'Bearer '.$this->manager->createToken('t')->plainTextToken];
});

it('assigne un ticket à un gestionnaire → assignee + notification', function () {
    $this->withHeaders($this->auth)
        ->patchJson("/api/gestionnaire/tickets/{$this->ticket->id}/assign", ['gestionnaire_id' => $this->gest->id])
        ->assertStatus(200)
        ->assertJsonPath('data.ticket.assigned_to', $this->gest->id)
        ->assertJsonPath('data.ticket.assignee.name', 'Karim');

    expect($this->ticket->fresh()->assigned_to)->toBe($this->gest->id);
    expect(Notification::where('user_id', $this->gest->id)->where('title', 'Ticket assigné')->exists())->toBeTrue();
});

it('désassigne avec gestionnaire_id null', function () {
    $this->ticket->update(['assigned_to' => $this->gest->id]);

    $this->withHeaders($this->auth)
        ->patchJson("/api/gestionnaire/tickets/{$this->ticket->id}/assign", ['gestionnaire_id' => null])
        ->assertStatus(200);

    expect($this->ticket->fresh()->assigned_to)->toBeNull();
});

it('refuse (422) un assigné qui n\'est pas gestionnaire/manager', function () {
    $resident = User::create(['tenant_id' => $this->tenant->id, 'name' => 'Hassan', 'phone' => '+212611111111', 'role' => 'resident', 'status' => 'active']);

    $this->withHeaders($this->auth)
        ->patchJson("/api/gestionnaire/tickets/{$this->ticket->id}/assign", ['gestionnaire_id' => $resident->id])
        ->assertStatus(422)->assertJsonValidationErrors('gestionnaire_id');
});

it('inbox : filtre les tickets assignés à moi', function () {
    $this->ticket->update(['assigned_to' => $this->gest->id]);
    Ticket::create(['tenant_id' => $this->tenant->id, 'residence_id' => $this->residence->id, 'user_id' => $this->manager->id, 'categorie' => 'autre', 'description' => 'Autre non assigné', 'priorite' => 'faible', 'statut' => 'ouvert']);

    $gestAuth = ['Authorization' => 'Bearer '.$this->gest->createToken('t')->plainTextToken];
    $res = $this->withHeaders($gestAuth)->getJson('/api/gestionnaire/tickets?assigned_to=me')->assertStatus(200);

    expect($res->json('data.meta.total'))->toBe(1)
        ->and($res->json('data.tickets.0.id'))->toBe($this->ticket->id);
});
