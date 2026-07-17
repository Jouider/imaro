<?php

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
});

it('renvoie la santé plateforme (services, files, intégrations)', function () {
    $this->withHeaders($this->auth)->getJson('/api/admin/health')
        ->assertStatus(200)
        ->assertJsonPath('data.services.database', true)
        ->assertJsonStructure(['data' => [
            'services' => ['database', 'redis', 'cache', 'storage'],
            'queue' => ['failed', 'pending'],
            'integrations' => ['whatsapp_twilio', 'email_brevo', 'push_fcm', 'push_apns', 'paiement_cmi'],
            'version', 'environment', 'last_migration',
        ]]);
});

it('liste les jobs en échec (vide par défaut)', function () {
    $this->withHeaders($this->auth)->getJson('/api/admin/failed-jobs')
        ->assertStatus(200)
        ->assertJsonPath('data', []);
});

it('un non super_admin est refusé (403)', function () {
    $mgr = User::create(['tenant_id' => $this->digitoyou->id, 'name' => 'Mgr', 'phone' => '+212600000009', 'role' => 'manager', 'status' => 'active']);
    $mgr->assignRole('manager');
    $mgrAuth = ['Authorization' => 'Bearer '.$mgr->createToken('t')->plainTextToken];

    $this->withHeaders($mgrAuth)->getJson('/api/admin/health')->assertStatus(403);
});
