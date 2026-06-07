<?php

use App\Contracts\Notifications\NotificationChannel;
use App\Contracts\Notifications\NotificationMessage;
use App\Contracts\Notifications\NotificationProvider;
use App\Contracts\Notifications\NotificationResult;
use App\Jobs\SendNotificationJob;
use App\Models\User;
use App\Notifications\NotificationManager;
use Illuminate\Support\Facades\Bus;
use Illuminate\Support\Facades\DB;

/**
 * Phase 1 — opt-out notification_prefs + async queue. Legal/transactional
 * messages (no category, or force=true) must never be muted.
 */
class SpyProvider implements NotificationProvider
{
    /** @var list<NotificationMessage> */
    public array $calls = [];

    public function __construct(private string $n, private string $c) {}

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
        $this->calls[] = $m;

        return NotificationResult::ok($this->n, 'msg-'.count($this->calls));
    }
}

function prefUser(array $prefs = []): User
{
    $u = new User();
    $u->id = 1;
    $u->tenant_id = 1;
    $u->phone = '+212600000000';
    $u->email = 'copro@example.ma';
    $u->notification_prefs = $prefs;

    return $u;
}

function smsMessage(User $to, ?string $category = null, bool $force = false): NotificationMessage
{
    return new NotificationMessage(
        to:           $to,
        channel:      NotificationChannel::Sms,
        templateName: 'test',
        body:         'hello',
        category:     $category,
        force:        $force,
    );
}

beforeEach(function () {
    DB::shouldReceive('table')->andReturnSelf();
    DB::shouldReceive('insert')->andReturn(true);
});

it('skips the send when the category is muted in prefs', function () {
    $spy = new SpyProvider('sms8', 'sms');
    $manager = new NotificationManager([$spy], ['sms' => ['sms8']]);

    $result = $manager->send(smsMessage(prefUser(['paiement' => false]), category: 'paiement'));

    expect($result->skipped)->toBeTrue()
        ->and($result->success)->toBeFalse()
        ->and($spy->calls)->toBeEmpty();
});

it('sends when the category is enabled (opt-out default true)', function () {
    $spy = new SpyProvider('sms8', 'sms');
    $manager = new NotificationManager([$spy], ['sms' => ['sms8']]);

    $result = $manager->send(smsMessage(prefUser(), category: 'paiement'));

    expect($result->success)->toBeTrue()
        ->and($spy->calls)->toHaveCount(1);
});

it('force-sends a legal message even when the category is muted', function () {
    $spy = new SpyProvider('sms8', 'sms');
    $manager = new NotificationManager([$spy], ['sms' => ['sms8']]);

    $result = $manager->send(smsMessage(prefUser(['paiement' => false]), category: 'paiement', force: true));

    expect($result->success)->toBeTrue()
        ->and($spy->calls)->toHaveCount(1);
});

it('never mutes an uncategorized (transactional) message', function () {
    $spy = new SpyProvider('sms8', 'sms');
    $manager = new NotificationManager([$spy], ['sms' => ['sms8']]);

    // Even with everything disabled, a null-category OTP/onboarding must go out.
    $result = $manager->send(smsMessage(prefUser(['paiement' => false, 'ticket' => false]), category: null));

    expect($result->success)->toBeTrue()
        ->and($spy->calls)->toHaveCount(1);
});

it('queue() dispatches a SendNotificationJob', function () {
    Bus::fake();
    $manager = new NotificationManager([], []);

    $manager->queue(smsMessage(prefUser(), category: 'paiement'));

    Bus::assertDispatched(SendNotificationJob::class, function ($job) {
        return $job->channel === NotificationChannel::Sms && $job->category === 'paiement';
    });
});

it('sendMany returns one result per channel', function () {
    $sms = new SpyProvider('sms8', 'sms');
    $manager = new NotificationManager([$sms], ['sms' => ['sms8']]);

    $results = $manager->sendMany([smsMessage(prefUser())]);

    expect($results)->toHaveKey('sms')
        ->and($results['sms']->success)->toBeTrue();
});
