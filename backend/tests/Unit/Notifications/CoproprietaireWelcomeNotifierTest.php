<?php

use App\Contracts\Notifications\NotificationChannel;
use App\Contracts\Notifications\NotificationMessage;
use App\Contracts\Notifications\NotificationResult;
use App\Models\Residence;
use App\Models\User;
use App\Notifications\NotificationManager;
use App\Services\Notifications\CoproprietaireWelcomeNotifier;

/**
 * Welcome notifier MUST fan out to every available channel. A copro without
 * email shouldn't break; a copro without phone (rare) shouldn't break either.
 */
class SpyManager extends NotificationManager
{
    /** @var list<NotificationMessage> */
    public array $sent = [];

    public function __construct() {}

    public function send(NotificationMessage $message): NotificationResult
    {
        $this->sent[] = $message;

        return NotificationResult::ok('spy', 'spy-'.count($this->sent));
    }
}

function welcomeUser(array $overrides = []): User
{
    $u = new User();
    $u->id = 1;
    $u->tenant_id = 1;
    $u->name = $overrides['name'] ?? 'Hassan Benali';
    $u->phone = array_key_exists('phone', $overrides) ? $overrides['phone'] : '+212600000000';
    $u->email = array_key_exists('email', $overrides) ? $overrides['email'] : 'hassan@example.ma';

    return $u;
}

function welcomeResidence(string $name = 'Résidence Atlas'): Residence
{
    $r = new Residence();
    $r->id = 1;
    $r->name = $name;

    return $r;
}

it('fans out to SMS + WhatsApp + Email when all channels available', function () {
    $spy = new SpyManager();
    (new CoproprietaireWelcomeNotifier($spy))->send(welcomeUser(), 'ABC12345', welcomeResidence());

    $channels = array_map(fn ($m) => $m->channel->value, $spy->sent);

    expect($channels)->toContain('sms', 'whatsapp', 'email')
        ->and(count($spy->sent))->toBe(3);
});

it('skips email when the user has no email', function () {
    $spy = new SpyManager();
    (new CoproprietaireWelcomeNotifier($spy))->send(welcomeUser(['email' => null]), 'ABC12345');

    $channels = array_map(fn ($m) => $m->channel->value, $spy->sent);

    expect($channels)->toContain('sms', 'whatsapp')
        ->and($channels)->not->toContain('email');
});

it('skips SMS + WhatsApp when the user has no phone', function () {
    $spy = new SpyManager();
    (new CoproprietaireWelcomeNotifier($spy))->send(welcomeUser(['phone' => null]), 'ABC12345');

    $channels = array_map(fn ($m) => $m->channel->value, $spy->sent);

    expect($channels)->toBe(['email']);
});

it('includes the access code in every message body', function () {
    $spy = new SpyManager();
    (new CoproprietaireWelcomeNotifier($spy))->send(welcomeUser(), 'XYZ99999', welcomeResidence());

    foreach ($spy->sent as $m) {
        expect($m->body)->toContain('XYZ99999');
    }
});
