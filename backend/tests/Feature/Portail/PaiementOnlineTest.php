<?php

use App\Models\Coproprietaire;
use App\Models\Immeuble;
use App\Models\Lot;
use App\Models\PaymentSession;
use App\Models\Residence;
use App\Models\Tenant;
use App\Models\User;
use App\Services\Payment\PaymentGateway;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Role;

uses(RefreshDatabase::class);

beforeEach(function () {
    Role::firstOrCreate(['name' => 'resident', 'guard_name' => 'web']);
    $this->tenant = Tenant::create(['name' => 'T', 'email' => 't@t.ma', 'subdomain' => 't', 'plan' => 'starter', 'status' => 'active']);
    config(['app.tenant_id' => $this->tenant->id]);

    $res = Residence::withoutGlobalScope('tenant')->create(['tenant_id' => $this->tenant->id, 'name' => 'Aqualina', 'address' => 'X', 'city' => 'Casa', 'total_tantieme' => 1000, 'nb_lots' => 1, 'status' => 'active', 'mode_cotisation' => 'tantieme']);
    $imm = Immeuble::withoutGlobalScope('tenant')->create(['tenant_id' => $this->tenant->id, 'residence_id' => $res->id, 'nom' => 'A', 'nb_etages' => 1, 'nb_lots' => 1]);
    $lot = Lot::withoutGlobalScope('tenant')->create(['tenant_id' => $this->tenant->id, 'residence_id' => $res->id, 'immeuble_id' => $imm->id, 'numero' => 'A1', 'type' => 'appartement', 'etage' => 1, 'tantieme' => 1000]);
    $this->resident = User::create(['tenant_id' => $this->tenant->id, 'name' => 'Hassan', 'phone' => '+212611111111', 'role' => 'resident', 'status' => 'active', 'password' => bcrypt('x')]);
    $this->resident->assignRole('resident');
    Coproprietaire::create(['tenant_id' => $this->tenant->id, 'user_id' => $this->resident->id, 'lot_id' => $lot->id, 'type' => 'proprietaire', 'solde_actuel' => 0]);

    $this->auth = ['Authorization' => 'Bearer '.$this->resident->createToken('t')->plainTextToken];
});

it('renvoie 422 quand aucune passerelle n\'est configurée', function () {
    $this->withHeaders($this->auth)->postJson('/api/portail/paiement/initier', ['montant' => 1500])
        ->assertStatus(422);
});

it('initie une session et renvoie payment_url + session_id (driver configuré)', function () {
    $this->app->bind(PaymentGateway::class, fn () => new class implements PaymentGateway
    {
        public function createSession(PaymentSession $s): string
        {
            return 'https://gw.test/pay/'.$s->session_id;
        }
    });
    config(['services.payment.gateway' => 'fake']);

    $res = $this->withHeaders($this->auth)->postJson('/api/portail/paiement/initier', [
        'montant' => 1500, 'reference' => 'COTIS-Q3',
    ])->assertStatus(200);

    $sid = $res->json('data.session_id');
    expect($sid)->not->toBeEmpty()
        ->and($res->json('data.payment_url'))->toBe('https://gw.test/pay/'.$sid);

    $session = PaymentSession::where('session_id', $sid)->first();
    expect($session)->not->toBeNull()
        ->and($session->statut)->toBe('pending')
        ->and((float) $session->montant)->toBe(1500.0)
        ->and($session->user_id)->toBe($this->resident->id);
});

it('refuse un montant invalide (422)', function () {
    $this->app->bind(PaymentGateway::class, fn () => new class implements PaymentGateway
    {
        public function createSession(PaymentSession $s): string
        {
            return 'x';
        }
    });
    $this->withHeaders($this->auth)->postJson('/api/portail/paiement/initier', ['montant' => 0])->assertStatus(422);
});

it('le retour public met à jour le statut + redirige vers le deep-link', function () {
    $session = PaymentSession::create([
        'session_id' => '11111111-1111-1111-1111-111111111111',
        'tenant_id' => $this->tenant->id, 'user_id' => $this->resident->id,
        'montant' => 1500, 'gateway' => 'fake', 'statut' => 'pending',
    ]);

    $this->get('/paiement/retour?session_id='.$session->session_id.'&status=success')
        ->assertRedirect('imaro://paiement/retour?status=success&session_id='.$session->session_id);

    expect($session->fresh()->statut)->toBe('success');
});
