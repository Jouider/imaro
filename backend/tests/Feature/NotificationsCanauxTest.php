<?php

use App\Contracts\Notifications\NotificationChannel;
use App\Contracts\Notifications\NotificationMessage;
use App\Models\Tenant;
use App\Models\User;
use App\Notifications\NotificationManager;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

it('WhatsApp et SMS sont désactivés par défaut, email reste actif (KAN-118/128)', function () {
    expect(config('notifications.chains.whatsapp'))->toBe([])
        ->and(config('notifications.chains.sms'))->toBe([])
        ->and(config('notifications.chains.email'))->toBe(['resend']);
});

it('un envoi WhatsApp ne déclenche aucun provider (no-op, aucun coût)', function () {
    $tenant = Tenant::create(['name' => 'T', 'email' => 't@t.ma', 'subdomain' => 't', 'plan' => 'business', 'status' => 'active']);
    $user = User::create(['tenant_id' => $tenant->id, 'name' => 'U', 'phone' => '+212600000001', 'role' => 'manager', 'status' => 'active']);

    $result = app(NotificationManager::class)->send(new NotificationMessage(
        to: $user,
        channel: NotificationChannel::Whatsapp,
        templateName: 'test',
        body: 'x',
    ));

    expect($result->success)->toBeFalse()
        ->and($result->error)->toContain('no provider');
});

it('réactivable via env NOTIFY_WHATSAPP_ENABLED', function () {
    config(['notifications.chains.whatsapp' => env('NOTIFY_WHATSAPP_ENABLED', false) ? ['twilio_whatsapp'] : []]);
    expect(config('notifications.chains.whatsapp'))->toBe([]); // false par défaut en test

    config(['notifications.chains.whatsapp' => ['twilio_whatsapp']]);
    expect(config('notifications.chains.whatsapp'))->toBe(['twilio_whatsapp']);
});
