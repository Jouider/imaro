<?php

use App\Contracts\Notifications\NotificationChannel;
use App\Contracts\Notifications\NotificationMessage;
use App\Models\User;
use App\Notifications\Channels\Sms8Provider;
use Illuminate\Support\Facades\Http;

function sms8User(): User
{
    $u = new User();
    $u->id = 1;
    $u->tenant_id = 1;
    $u->phone = '+212600000000';
    return $u;
}

function sms8Message(): NotificationMessage
{
    return new NotificationMessage(
        to:           sms8User(),
        channel:      NotificationChannel::Sms,
        templateName: 'test',
        body:         'hello',
    );
}

it('returns a simulated success when credentials are missing', function () {
    $p = new Sms8Provider(apiKey: null, deviceId: null);

    $r = $p->send(sms8Message());

    expect($r->success)->toBeTrue()
        ->and($r->providerMessageId)->toStartWith('simulated:');
});

it('returns success when sms8 api responds with success:true', function () {
    Http::fake([
        'sms8.io/*' => Http::response([
            'success' => true,
            'data'    => ['messages' => [['ID' => 'abc-123']]],
        ], 200),
    ]);

    $p = new Sms8Provider(apiKey: 'k', deviceId: 'd1');

    $r = $p->send(sms8Message());

    expect($r->success)->toBeTrue()
        ->and($r->providerMessageId)->toBe('abc-123');
});

it('returns failure when sms8 api responds with success:false', function () {
    Http::fake([
        'sms8.io/*' => Http::response([
            'success' => false,
            'error'   => ['message' => 'sim blocked'],
        ], 200),
    ]);

    $p = new Sms8Provider(apiKey: 'k', deviceId: 'd1');

    $r = $p->send(sms8Message());

    expect($r->success)->toBeFalse()
        ->and($r->error)->toBe('sim blocked');
});

it('returns failure when http request throws', function () {
    Http::fake(function () {
        throw new RuntimeException('network down');
    });

    $p = new Sms8Provider(apiKey: 'k', deviceId: 'd1');

    $r = $p->send(sms8Message());

    expect($r->success)->toBeFalse()
        ->and($r->error)->toBe('network down');
});
