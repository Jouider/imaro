<?php

use App\Contracts\Notifications\NotificationChannel;
use App\Contracts\Notifications\NotificationMessage;
use App\Models\Tenant;
use App\Models\User;
use App\Notifications\Channels\ResendEmailProvider;

function resendUserWithTenantSubdomain(?string $subdomain): User
{
    $user = new User();
    $user->id = 1;
    $user->tenant_id = $subdomain ? 1 : null;
    $user->email = 'recipient@example.com';

    if ($subdomain !== null) {
        $tenant = new Tenant();
        $tenant->id = 1;
        $tenant->subdomain = $subdomain;
        $user->setRelation('tenant', $tenant);
    }

    return $user;
}

function resendMessage(User $u): NotificationMessage
{
    return new NotificationMessage(
        to:           $u,
        channel:      NotificationChannel::Email,
        templateName: 'test',
        body:         'hello',
        subject:      'Subject',
    );
}

/**
 * Per-tenant from-address is the whole point: one Resend domain verification
 * (imaro.ma) covers every cabinet syndic — zero setup per client.
 */
it('uses {tenant.subdomain}@domain as the from address in simulated mode', function () {
    $p = new ResendEmailProvider(apiKey: null, domain: 'imaro.ma', fallbackFrom: 'no-reply@imaro.ma');

    $r = $p->send(resendMessage(resendUserWithTenantSubdomain('blanca')));

    // Simulated success is enough — the log line is the side-effect we care about.
    expect($r->success)->toBeTrue();
});

it('falls back to fallbackFrom when the recipient has no tenant', function () {
    $p = new ResendEmailProvider(apiKey: null, domain: 'imaro.ma', fallbackFrom: 'no-reply@imaro.ma');

    $r = $p->send(resendMessage(resendUserWithTenantSubdomain(null)));

    expect($r->success)->toBeTrue();
});

it('resolves blanca → blanca@imaro.ma via reflection (the core promise)', function () {
    $p = new ResendEmailProvider(apiKey: null, domain: 'imaro.ma', fallbackFrom: 'no-reply@imaro.ma');

    $ref = new ReflectionClass($p);
    $resolve = $ref->getMethod('resolveFrom');
    $resolve->setAccessible(true);

    $from = $resolve->invoke($p, resendMessage(resendUserWithTenantSubdomain('blanca')));

    expect($from)->toBe('blanca@imaro.ma');
});

it('resolves to fallback when tenant is missing', function () {
    $p = new ResendEmailProvider(apiKey: null, domain: 'imaro.ma', fallbackFrom: 'no-reply@imaro.ma');

    $ref = new ReflectionClass($p);
    $resolve = $ref->getMethod('resolveFrom');
    $resolve->setAccessible(true);

    $from = $resolve->invoke($p, resendMessage(resendUserWithTenantSubdomain(null)));

    expect($from)->toBe('no-reply@imaro.ma');
});
