<?php

use App\Contracts\Notifications\NotificationChannel;
use App\Contracts\Notifications\NotificationMessage;
use App\Contracts\Notifications\NotificationProvider;
use App\Contracts\Notifications\NotificationResult;
use App\Models\User;
use App\Notifications\NotificationManager;
use Illuminate\Support\Facades\DB;

/**
 * Fallback is the single most important guarantee of the abstraction —
 * if SMS8 dies in prod, the manager must route to Twilio without any
 * caller code change. These tests pin that behaviour.
 */
function fakeProvider(string $name, string $channel, bool $ok): NotificationProvider
{
    return new class($name, $channel, $ok) implements NotificationProvider {
        public function __construct(
            private string $n,
            private string $c,
            private bool $ok,
        ) {}
        public function name(): string { return $this->n; }
        public function channel(): NotificationChannel { return NotificationChannel::from($this->c); }
        public function send(NotificationMessage $m): NotificationResult
        {
            return $this->ok
                ? NotificationResult::ok($this->n, 'msg-'.$this->n)
                : NotificationResult::fail($this->n, 'forced failure');
        }
    };
}

function fakeUser(): User
{
    $u = new User();
    $u->id = 999;
    $u->tenant_id = 1;
    $u->phone = '+212600000000';
    $u->email = 'test@example.com';
    return $u;
}

beforeEach(function () {
    DB::shouldReceive('table')->andReturnSelf();
    DB::shouldReceive('insert')->andReturn(true);
});

it('falls back to next provider when the primary fails', function () {
    $manager = new NotificationManager(
        providers: [
            fakeProvider('sms8', 'sms', false),
            fakeProvider('twilio_sms', 'sms', true),
        ],
        chainOrder: ['sms' => ['sms8', 'twilio_sms']],
    );

    $result = $manager->send(new NotificationMessage(
        to:           fakeUser(),
        channel:      NotificationChannel::Sms,
        templateName: 'test',
        body:         'hello',
    ));

    expect($result->success)->toBeTrue()
        ->and($result->provider)->toBe('twilio_sms');
});

it('returns failure when every provider in the chain fails', function () {
    $manager = new NotificationManager(
        providers: [
            fakeProvider('sms8', 'sms', false),
            fakeProvider('twilio_sms', 'sms', false),
        ],
        chainOrder: ['sms' => ['sms8', 'twilio_sms']],
    );

    $result = $manager->send(new NotificationMessage(
        to:           fakeUser(),
        channel:      NotificationChannel::Sms,
        templateName: 'test',
        body:         'hello',
    ));

    expect($result->success)->toBeFalse();
});

it('returns failure when no provider is configured for the channel', function () {
    $manager = new NotificationManager(providers: [], chainOrder: []);

    $result = $manager->send(new NotificationMessage(
        to:           fakeUser(),
        channel:      NotificationChannel::Email,
        templateName: 'test',
        body:         'hello',
    ));

    expect($result->success)->toBeFalse()
        ->and($result->provider)->toBe('none');
});
