<?php

use App\Models\Lead;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Role;

uses(RefreshDatabase::class);

beforeEach(function () {
    Role::firstOrCreate(['name' => 'super_admin', 'guard_name' => 'web']);

    $tenant = Tenant::create(['name' => 'Digitoyou', 'email' => 'ops@imaro.ma', 'subdomain' => 'ops', 'plan' => 'enterprise', 'status' => 'active']);
    $this->admin = User::create(['tenant_id' => $tenant->id, 'name' => 'Admin', 'phone' => '+212600000000', 'role' => 'super_admin', 'status' => 'active']);
    $this->admin->assignRole('super_admin');
    $this->auth = ['Authorization' => 'Bearer '.$this->admin->createToken('t')->plainTextToken];
});

it('crée un lead et le liste', function () {
    $this->withHeaders($this->auth)->postJson('/api/admin/leads', [
        'cabinet_nom' => 'Syndic Al Blanca', 'contact_nom' => 'Fikri', 'contact_email' => 'fikri@x.ma',
        'ville' => 'Casablanca', 'source' => 'salon', 'date_demo' => '2026-07-20',
    ])->assertStatus(201)->assertJsonPath('data.lead.statut', 'nouveau');

    $this->withHeaders($this->auth)->getJson('/api/admin/leads?source=salon')
        ->assertStatus(200)->assertJsonCount(1, 'data.leads');
});

it('met à jour le statut du lead (pipeline)', function () {
    $lead = Lead::create(['cabinet_nom' => 'X', 'source' => 'site', 'statut' => 'nouveau']);

    $this->withHeaders($this->auth)->putJson("/api/admin/leads/{$lead->id}", ['statut' => 'demo_planifiee'])
        ->assertStatus(200)->assertJsonPath('data.lead.statut', 'demo_planifiee');
});

it('convertit un lead en client (Tenant en essai)', function () {
    $lead = Lead::create(['cabinet_nom' => 'Cabinet Océan', 'contact_email' => 'ocean@x.ma', 'source' => 'recommandation', 'statut' => 'demo_planifiee']);

    $res = $this->withHeaders($this->auth)->postJson("/api/admin/leads/{$lead->id}/convertir", ['plan' => 'business'])
        ->assertStatus(201)
        ->assertJsonPath('data.tenant.plan', 'business')
        ->assertJsonPath('data.tenant.status', 'trial');

    $tenantId = $res->json('data.tenant.id');
    expect(Tenant::find($tenantId))->not->toBeNull()
        ->and($lead->fresh()->statut)->toBe('gagne')
        ->and($lead->fresh()->converted_tenant_id)->toBe($tenantId);
});

it('refuse la conversion sans email de contact (422)', function () {
    $lead = Lead::create(['cabinet_nom' => 'Sans email', 'source' => 'appel', 'statut' => 'nouveau']);

    $this->withHeaders($this->auth)->postJson("/api/admin/leads/{$lead->id}/convertir")
        ->assertStatus(422);
});

it('refuse une double conversion (422)', function () {
    $t = Tenant::create(['name' => 'Déjà', 'email' => 'deja@x.ma', 'subdomain' => 'deja', 'plan' => 'starter', 'status' => 'trial']);
    $lead = Lead::create(['cabinet_nom' => 'Déjà', 'contact_email' => 'lead@x.ma', 'source' => 'site', 'statut' => 'gagne', 'converted_tenant_id' => $t->id]);

    $this->withHeaders($this->auth)->postJson("/api/admin/leads/{$lead->id}/convertir")
        ->assertStatus(422);
});
