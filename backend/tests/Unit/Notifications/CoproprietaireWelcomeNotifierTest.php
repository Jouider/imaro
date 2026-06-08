<?php

use App\Contracts\Notifications\NotificationMessage;
use App\Contracts\Notifications\NotificationResult;
use App\Models\Residence;
use App\Models\User;
use App\Notifications\NotificationManager;
use App\Services\Notifications\CoproprietaireWelcomeNotifier;

/**
 * Onboarding delivery is a PRIORITY CASCADE — the access code must land on
 * exactly ONE channel, most universal first: SMS → WhatsApp → Email. It stops
 * at the first success; it never fans out to every channel.
 */
class CascadeSpy extends NotificationManager
{
    /** @var list<NotificationMessage> every message actually attempted, in order */
    public array $attempted = [];

    /** @var list<string> channel values that should be forced to fail */
    public array $failChannels = [];

    public function __construct() {}

    public function send(NotificationMessage $message): NotificationResult
    {
        $this->attempted[] = $message;

        if (in_array($message->channel->value, $this->failChannels, true)) {
            return NotificationResult::fail('spy', 'forced fail '.$message->channel->value);
        }

        return NotificationResult::ok('spy', 'spy-'.count($this->attempted));
    }

    /** @return list<string> attempted channel values in order */
    public function channels(): array
    {
        return array_map(fn ($m) => $m->channel->value, $this->attempted);
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

beforeEach(function () {
    // WhatsApp auth template approved by default in these tests.
    config(['notifications.whatsapp_templates.acces_copro' => 'HXtest']);
});

it('delivers via SMS first and stops there when SMS succeeds', function () {
    $spy = new CascadeSpy();
    (new CoproprietaireWelcomeNotifier($spy))->send(welcomeUser(), 'ABC12345', welcomeResidence());

    // Only one attempt — the most universal channel — no fan-out.
    expect($spy->channels())->toBe(['sms']);
});

it('falls back to WhatsApp when SMS fails', function () {
    $spy = new CascadeSpy();
    $spy->failChannels = ['sms'];
    (new CoproprietaireWelcomeNotifier($spy))->send(welcomeUser(), 'ABC12345', welcomeResidence());

    expect($spy->channels())->toBe(['sms', 'whatsapp']);
});

it('falls back to Email when both SMS and WhatsApp fail', function () {
    $spy = new CascadeSpy();
    $spy->failChannels = ['sms', 'whatsapp'];
    (new CoproprietaireWelcomeNotifier($spy))->send(welcomeUser(), 'ABC12345', welcomeResidence());

    expect($spy->channels())->toBe(['sms', 'whatsapp', 'email']);
});

it('skips the WhatsApp step when no auth template is configured', function () {
    config(['notifications.whatsapp_templates.acces_copro' => null]);
    $spy = new CascadeSpy();
    $spy->failChannels = ['sms'];
    (new CoproprietaireWelcomeNotifier($spy))->send(welcomeUser(), 'ABC12345', welcomeResidence());

    expect($spy->channels())->toBe(['sms', 'email']);
});

it('uses Email only when the user has no phone', function () {
    $spy = new CascadeSpy();
    (new CoproprietaireWelcomeNotifier($spy))->send(welcomeUser(['phone' => null]), 'ABC12345');

    expect($spy->channels())->toBe(['email']);
});

it('passes the code as the WhatsApp auth template variable {{1}}', function () {
    $spy = new CascadeSpy();
    $spy->failChannels = ['sms']; // force the cascade to reach WhatsApp
    (new CoproprietaireWelcomeNotifier($spy))->send(welcomeUser(), 'XYZ99999', welcomeResidence());

    $wa = collect($spy->attempted)->firstWhere(fn ($m) => $m->channel->value === 'whatsapp');

    expect($wa->meta['content_sid'])->toBe('HXtest')
        ->and($wa->meta['content_variables'])->toBe(['1' => 'XYZ99999']);
});

it('includes the access code in the SMS + Email bodies', function () {
    $spy = new CascadeSpy();
    $spy->failChannels = ['sms', 'whatsapp']; // reach all channels
    (new CoproprietaireWelcomeNotifier($spy))->send(welcomeUser(), 'XYZ99999', welcomeResidence());

    foreach ($spy->attempted as $m) {
        if (in_array($m->channel->value, ['sms', 'email'], true)) {
            expect($m->body)->toContain('XYZ99999');
        }
    }
});
