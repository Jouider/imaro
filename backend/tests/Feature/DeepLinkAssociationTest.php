<?php

it('sert apple-app-site-association en JSON avec l\'appID composé', function () {
    config([
        'deeplinks.apple_team_id' => 'ABCDE12345',
        'deeplinks.apple_bundle_id' => 'ma.imaro.portail',
        'deeplinks.paths' => ['/portail/*'],
    ]);

    $res = $this->get('/.well-known/apple-app-site-association')
        ->assertStatus(200);

    expect($res->headers->get('content-type'))->toContain('application/json');
    $res->assertJsonPath('applinks.details.0.appID', 'ABCDE12345.ma.imaro.portail')
        ->assertJsonPath('applinks.details.0.paths.0', '/portail/*');
});

it('sert assetlinks.json avec le package et les empreintes SHA-256', function () {
    config([
        'deeplinks.android_package' => 'ma.imaro.portail',
        'deeplinks.android_sha256' => ['AA:BB:CC'],
    ]);

    $this->get('/.well-known/assetlinks.json')
        ->assertStatus(200)
        ->assertJsonPath('0.relation.0', 'delegate_permission/common.handle_all_urls')
        ->assertJsonPath('0.target.namespace', 'android_app')
        ->assertJsonPath('0.target.package_name', 'ma.imaro.portail')
        ->assertJsonPath('0.target.sha256_cert_fingerprints.0', 'AA:BB:CC');
});

it('autorise l\'origine Capacitor en CORS sur l\'API', function () {
    $res = $this->call('OPTIONS', '/api/auth/login', [], [], [], [
        'HTTP_ORIGIN' => 'capacitor://localhost',
        'HTTP_ACCESS_CONTROL_REQUEST_METHOD' => 'POST',
    ]);

    expect($res->headers->get('access-control-allow-origin'))->toBe('capacitor://localhost');
});
