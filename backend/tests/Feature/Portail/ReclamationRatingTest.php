<?php

use App\Models\Coproprietaire;
use App\Models\Immeuble;
use App\Models\Lot;
use App\Models\Residence;
use App\Models\Tenant;
use App\Models\Ticket;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Role;

uses(RefreshDatabase::class);

beforeEach(function () {
    foreach (['manager', 'resident'] as $r) {
        Role::firstOrCreate(['name' => $r, 'guard_name' => 'web']);
    }

    $this->tenant = Tenant::create(['name' => 'T', 'email' => 't@t.ma', 'subdomain' => 't', 'plan' => 'business', 'status' => 'active']);
    config(['app.tenant_id' => $this->tenant->id]);

    $gest = User::create(['tenant_id' => $this->tenant->id, 'name' => 'G', 'phone' => '+212600000001', 'role' => 'manager', 'status' => 'active']);
    $this->residence = Residence::withoutGlobalScope('tenant')->create(['tenant_id' => $this->tenant->id, 'gestionnaire_id' => $gest->id, 'name' => 'Aqualina', 'address' => 'X', 'city' => 'Casa', 'total_tantieme' => 1000, 'nb_lots' => 1, 'status' => 'active', 'mode_cotisation' => 'tantieme']);
    $imm = Immeuble::withoutGlobalScope('tenant')->create(['tenant_id' => $this->tenant->id, 'residence_id' => $this->residence->id, 'nom' => 'A', 'nb_etages' => 1, 'nb_lots' => 1]);
    $this->lot = Lot::withoutGlobalScope('tenant')->create(['tenant_id' => $this->tenant->id, 'residence_id' => $this->residence->id, 'immeuble_id' => $imm->id, 'numero' => 'A1', 'type' => 'appartement', 'etage' => 1, 'tantieme' => 1000]);

    $this->resident = User::create(['tenant_id' => $this->tenant->id, 'name' => 'Hassan', 'phone' => '+212611111111', 'role' => 'resident', 'status' => 'active', 'password' => bcrypt('x')]);
    $this->resident->assignRole('resident');
    Coproprietaire::create(['tenant_id' => $this->tenant->id, 'user_id' => $this->resident->id, 'lot_id' => $this->lot->id, 'type' => 'proprietaire', 'solde_actuel' => 0]);

    $this->resAuth = ['Authorization' => 'Bearer '.$this->resident->createToken('t')->plainTextToken];
});

function ticketResident(string $statut = 'resolu'): Ticket
{
    return Ticket::create([
        'tenant_id' => test()->tenant->id,
        'residence_id' => test()->residence->id,
        'user_id' => test()->resident->id,
        'lot_id' => test()->lot->id,
        'categorie' => 'plomberie',
        'description' => "Fuite\n\nFuite sous l'évier",
        'priorite' => 'normal',
        'statut' => $statut,
    ]);
}

it('le résident note une réclamation résolue (satisfait) → note_satisfaction persistée + renvoyée', function () {
    $ticket = ticketResident('resolu');

    $this->withHeaders($this->resAuth)->patchJson("/api/portail/reclamations/{$ticket->id}/rating", ['rating' => 'satisfait'])
        ->assertStatus(200)
        ->assertJsonPath('status', 'success')
        ->assertJsonPath('data.rating', 'satisfait');

    expect($ticket->fresh()->note_satisfaction)->toBe(5);

    // L'index reflète l'avis donné.
    $this->withHeaders($this->resAuth)->getJson('/api/portail/reclamations')
        ->assertJsonPath('data.reclamations.0.rating', 'satisfait');
});

it('insatisfait → note basse', function () {
    $ticket = ticketResident('clos');

    $this->withHeaders($this->resAuth)->patchJson("/api/portail/reclamations/{$ticket->id}/rating", ['rating' => 'insatisfait'])
        ->assertStatus(200);

    expect($ticket->fresh()->note_satisfaction)->toBe(1);
});

it('refuse une valeur de rating invalide (422)', function () {
    $ticket = ticketResident('resolu');

    $this->withHeaders($this->resAuth)->patchJson("/api/portail/reclamations/{$ticket->id}/rating", ['rating' => 'moyen'])
        ->assertStatus(422)->assertJsonValidationErrors(['rating']);
});

it('refuse de noter une réclamation non encore traitée (422)', function () {
    $ticket = ticketResident('ouvert');

    $this->withHeaders($this->resAuth)->patchJson("/api/portail/reclamations/{$ticket->id}/rating", ['rating' => 'satisfait'])
        ->assertStatus(422);

    expect($ticket->fresh()->note_satisfaction)->toBeNull();
});

it('un résident ne peut pas noter la réclamation d\'un autre (404)', function () {
    $autre = User::create(['tenant_id' => $this->tenant->id, 'name' => 'Autre', 'phone' => '+212622222222', 'role' => 'resident', 'status' => 'active', 'password' => bcrypt('x')]);
    $autre->assignRole('resident');
    $autreAuth = ['Authorization' => 'Bearer '.$autre->createToken('t')->plainTextToken];

    $ticket = ticketResident('resolu'); // appartient au résident principal

    $this->withHeaders($autreAuth)->patchJson("/api/portail/reclamations/{$ticket->id}/rating", ['rating' => 'satisfait'])
        ->assertStatus(404);
});
