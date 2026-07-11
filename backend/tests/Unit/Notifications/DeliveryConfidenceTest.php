<?php

use App\Contracts\Notifications\NotificationChannel;
use App\Contracts\Notifications\NotificationMessage;
use App\Contracts\Notifications\NotificationProvider;
use App\Contracts\Notifications\NotificationResult;
use App\Models\User;
use App\Notifications\NotificationManager;
use Illuminate\Support\Facades\DB;

/**
 * A gateway that only ACCEPTS a message (no delivery confirmation, e.g. SMS8
 * personal-SIM) must not terminate a cascade — otherwise the code silently
 * never arrives. The cascade keeps going to a confirmed channel.
 */
function confidenceProvider(string $name, string $channel, string $mode): NotificationProvider
{
    // $mode: 'ok' (confirmed) | 'accepted' (unconfirmed) | 'fail'
    return new class($name, $channel, $mode) implements NotificationProvider
    {
        public function __construct(private string $n, private string $c, private string $mode) {}

        public function name(): string
        {
            return $this->n;
        }

        public function channel(): NotificationChannel
        {
            return NotificationChannel::from($this->c);
        }

        public function send(NotificationMessage $m): NotificationResult
        {
            return match ($this->mode) {
                'ok'       => NotificationResult::ok($this->n, 'id-'.$this->n),
                'accepted' => NotificationResult::accepted($this->n, 'id-'.$this->n),
                default    => NotificationResult::fail($this->n, 'boom'),
            };
        }
    };
}

function confidenceUser(): User
{
    $u = new User();
    $u->id = 1;
    $u->tenant_id = 1;
    $u->phone = '+212600000000';
    $u->email = 'copro@example.ma';

    return $u;
}

function msg(NotificationChannel $channel): NotificationMessage
{
    return new NotificationMessage(
        to:           confidenceUser(),
        channel:      $channel,
        templateName: 'welcome',
        body:         'hello',
    );
}

beforeEach(function () {
    DB::shouldReceive('table')->andReturnSelf();
    DB::shouldReceive('insert')->andReturn(true);
});

it('accepted() is a success but not confirmed', function () {
    $r = NotificationResult::accepted('sms8', 'x');

    expect($r->success)->toBeTrue()
        ->and($r->confirmed)->toBeFalse();
});

it('cascade does NOT stop on an accepted-but-unconfirmed send', function () {
    $manager = new NotificationManager(
        providers: [
            confidenceProvider('sms8', 'sms', 'accepted'),  // accepted only
            confidenceProvider('resend', 'email', 'ok'),    // confirmed
        ],
        chainOrder: ['sms' => ['sms8'], 'email' => ['resend']],
    );

    $result = $manager->sendCascade([
        msg(NotificationChannel::Sms),
        msg(NotificationChannel::Email),
    ]);

    // Reached the confirmed email channel, not the unconfirmed SMS.
    expect($result->success)->toBeTrue()
        ->and($result->confirmed)->toBeTrue()
        ->and($result->provider)->toBe('resend');
});

it('cascade stops on the first CONFIRMED success', function () {
    $manager = new NotificationManager(
        providers: [
            confidenceProvider('sms8', 'sms', 'ok'),     // confirmed
            confidenceProvider('resend', 'email', 'ok'),
        ],
        chainOrder: ['sms' => ['sms8'], 'email' => ['resend']],
    );

    $result = $manager->sendCascade([
        msg(NotificationChannel::Sms),
        msg(NotificationChannel::Email),
    ]);

    expect($result->provider)->toBe('sms8');
});
