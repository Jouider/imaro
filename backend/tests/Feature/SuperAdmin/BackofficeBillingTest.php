<?php

use App\Models\Invoice;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Role;

uses(RefreshDatabase::class);

beforeEach(function () {
    foreach (['super_admin', 'manager'] as $r) {
        Role::firstOrCreate(['name' => $r, 'guard_name' => 'web']);
    }

    $this->digitoyou = Tenant::create(['name' => 'Digitoyou', 'email' => 'ops@imaro.ma', 'subdomain' => 'ops', 'plan' => 'enterprise', 'status' => 'active']);
    $this->admin = User::create(['tenant_id' => $this->digitoyou->id, 'name' => 'Admin', 'phone' => '+212600000000', 'role' => 'super_admin', 'status' => 'active']);
    $this->admin->assignRole('super_admin');
    $this->auth = ['Authorization' => 'Bearer '.$this->admin->createToken('t')->plainTextToken];

    $this->client = Tenant::create(['name' => 'Cabinet A', 'email' => 'a@a.ma', 'subdomain' => 'a', 'plan' => 'business', 'status' => 'active']);
});

it('génère une facture avec remise puis la liste (super_admin)', function () {
    $this->withHeaders($this->auth)->postJson("/api/admin/tenants/{$this->client->id}/invoices", [
        'montant_dh' => 1200,
        'remise_pct' => 10,
        'periode_label' => 'Juillet 2026',
    ])->assertStatus(201)
        ->assertJsonPath('data.montant_dh', 1080)   // 1200 - 10%
        ->assertJsonPath('data.statut', 'envoyee')
        ->assertJsonPath('data.tenant.name', 'Cabinet A');

    $this->withHeaders($this->auth)->getJson('/api/admin/invoices')
        ->assertStatus(200)
        ->assertJsonPath('data.0.numero', fn ($n) => str_starts_with($n, 'FA-'));
});

it('marque une facture payée puis en annule une autre', function () {
    $inv = Invoice::create([
        'tenant_id' => $this->client->id, 'numero' => 'FA-2026-00001', 'montant_dh' => 1200,
        'statut' => 'envoyee', 'date_emission' => now()->toDateString(), 'date_echeance' => now()->addDays(30)->toDateString(),
    ]);

    $this->withHeaders($this->auth)->postJson("/api/admin/invoices/{$inv->id}/mark-paid")
        ->assertStatus(200)->assertJsonPath('data.statut', 'payee');
    expect($inv->fresh()->date_paiement)->not->toBeNull();

    $this->withHeaders($this->auth)->postJson("/api/admin/invoices/{$inv->id}/cancel")
        ->assertStatus(200)->assertJsonPath('data.statut', 'annulee');
});

it('met à jour l\'abonnement (plan + remise + renouvellement)', function () {
    $this->withHeaders($this->auth)->putJson("/api/admin/tenants/{$this->client->id}/subscription", [
        'plan' => 'pro', 'discount_pct' => 15, 'renewal_at' => '2027-01-01',
    ])->assertStatus(200)->assertJsonPath('data.plan', 'pro')->assertJsonPath('data.discount_pct', 15);
});

it('un non super_admin est refusé (403)', function () {
    $mgr = User::create(['tenant_id' => $this->client->id, 'name' => 'Mgr', 'phone' => '+212600000009', 'role' => 'manager', 'status' => 'active']);
    $mgr->assignRole('manager');
    $mgrAuth = ['Authorization' => 'Bearer '.$mgr->createToken('t')->plainTextToken];

    $this->withHeaders($mgrAuth)->getJson('/api/admin/invoices')->assertStatus(403);
});
