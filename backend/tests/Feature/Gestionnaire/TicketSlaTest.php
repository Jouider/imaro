<?php

use App\Models\Notification;
use App\Models\Residence;
use App\Models\Tenant;
use App\Models\Ticket;
use App\Models\TicketSlaConfig;
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

    $this->manager = User::create(['tenant_id' => $this->tenant->id, 'name' => 'Mgr', 'phone' => '+212600000001', 'role' => 'manager', 'status' => 'active']);
    $this->manager->assignRole('manager');
    $this->gest = User::create(['tenant_id' => $this->tenant->id, 'name' => 'Gest', 'phone' => '+212600000002', 'role' => 'gestionnaire', 'status' => 'active']);
    $this->gest->assignRole('gestionnaire');

    $this->residence = Residence::withoutGlobalScope('tenant')->create(['tenant_id' => $this->tenant->id, 'gestionnaire_id' => $this->manager->id, 'name' => 'Atlas', 'address' => 'X', 'city' => 'Casa', 'total_tantieme' => 1000, 'nb_lots' => 1, 'status' => 'active', 'mode_cotisation' => 'tantieme']);

    $this->managerAuth = ['Authorization' => 'Bearer '.$this->manager->createToken('t')->plainTextToken];
    $this->gestAuth = ['Authorization' => 'Bearer '.$this->gest->createToken('t')->plainTextToken];
});

function ticketAge(array $attrs, int $hoursAgo): Ticket
{
    $t = Ticket::create(array_merge([
        'tenant_id' => test()->tenant->id,
        'residence_id' => test()->residence->id,
        'user_id' => test()->gest->id,
        'categorie' => 'plomberie',
        'description' => 'Fuite',
        'priorite' => 'normal',
        'statut' => 'ouvert',
    ], $attrs));
    Ticket::where('id', $t->id)->update(['created_at' => now()->subHours($hoursAgo)]);

    return $t->fresh();
}

it('rappelle un ticket urgent dépassant 24h → notifie manager + gestionnaire assigné', function () {
    $t = ticketAge(['priorite' => 'urgent', 'assigned_to' => $this->gest->id], 25);

    $this->artisan('tickets:sla-reminders')->assertSuccessful();

    expect(Notification::where('title', 'Ticket en retard (SLA)')->where('user_id', $this->manager->id)->count())->toBe(1)
        ->and(Notification::where('title', 'Ticket en retard (SLA)')->where('user_id', $this->gest->id)->count())->toBe(1)
        ->and($t->fresh()->sla_reminded_at)->not->toBeNull();
});

it('ne rappelle pas un ticket urgent encore dans le délai (10h < 24h)', function () {
    ticketAge(['priorite' => 'urgent'], 10);

    $this->artisan('tickets:sla-reminders')->assertSuccessful();

    expect(Notification::where('title', 'Ticket en retard (SLA)')->count())->toBe(0);
});

it('applique le bon délai par gravité (normal 72h)', function () {
    ticketAge(['priorite' => 'normal'], 80);  // > 72h → rappel
    ticketAge(['priorite' => 'faible'], 80);  // < 168h → pas de rappel

    $this->artisan('tickets:sla-reminders')->assertSuccessful();

    // Seul le ticket normal déclenche (1 notif manager, pas d'assigné).
    expect(Notification::where('title', 'Ticket en retard (SLA)')->count())->toBe(1);
});

it('ne rappelle pas un ticket résolu/clos', function () {
    ticketAge(['priorite' => 'urgent', 'statut' => 'resolu'], 100);

    $this->artisan('tickets:sla-reminders')->assertSuccessful();

    expect(Notification::where('title', 'Ticket en retard (SLA)')->count())->toBe(0);
});

it('est idempotent : pas de double rappel (sla_reminded_at)', function () {
    ticketAge(['priorite' => 'urgent'], 30);

    $this->artisan('tickets:sla-reminders')->assertSuccessful();
    $this->artisan('tickets:sla-reminders')->assertSuccessful();

    expect(Notification::where('title', 'Ticket en retard (SLA)')->count())->toBe(1);
});

it('respecte la config désactivée + les délais personnalisés', function () {
    // Désactivé → aucun rappel même si dépassé.
    TicketSlaConfig::create(['tenant_id' => $this->tenant->id, 'enabled' => false, 'urgent_hours' => 1, 'normal_hours' => 72, 'faible_hours' => 168]);
    ticketAge(['priorite' => 'urgent'], 30);
    $this->artisan('tickets:sla-reminders')->assertSuccessful();
    expect(Notification::where('title', 'Ticket en retard (SLA)')->count())->toBe(0);

    // Réactivé avec urgent_hours=1 → un ticket de 2h déclenche.
    TicketSlaConfig::where('tenant_id', $this->tenant->id)->update(['enabled' => true]);
    ticketAge(['priorite' => 'urgent'], 2);
    $this->artisan('tickets:sla-reminders')->assertSuccessful();
    expect(Notification::where('title', 'Ticket en retard (SLA)')->count())->toBeGreaterThan(0);
});

it('manager lit et met à jour la config SLA', function () {
    $this->withHeaders($this->managerAuth)->getJson('/api/gestionnaire/tickets/sla-config')
        ->assertStatus(200)
        ->assertJsonPath('data.sla.urgent_hours', 24); // défaut

    $this->withHeaders($this->managerAuth)->putJson('/api/gestionnaire/tickets/sla-config', [
        'enabled' => true, 'urgent_hours' => 12, 'normal_hours' => 48, 'faible_hours' => 120,
    ])->assertStatus(200)->assertJsonPath('data.sla.urgent_hours', 12);

    expect(TicketSlaConfig::forTenant($this->tenant->id)->urgent_hours)->toBe(12);
});

it('un gestionnaire ne peut pas modifier la config SLA (403)', function () {
    // Test isolé (gestAuth seul) : éviter le cache de guard entre users d'un même test.
    $this->withHeaders($this->gestAuth)->putJson('/api/gestionnaire/tickets/sla-config', [
        'enabled' => true, 'urgent_hours' => 1, 'normal_hours' => 1, 'faible_hours' => 1,
    ])->assertStatus(403);
});
