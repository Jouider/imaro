<?php

namespace App\Services;

use App\Models\DeviceToken;
use App\Models\User;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Envoi de notifications push natives (FCM Android / APNs iOS) — KAN-68.
 *
 * Tout est piloté par la config `services.fcm` / `services.apns`. Si les
 * identifiants ne sont pas présents (cas tant que l'app native n'est pas en
 * prod), le service **no-op** silencieusement (log debug) — il ne casse jamais
 * le flux appelant (le push est best-effort). Toute erreur réseau est attrapée.
 */
class NativePushService
{
    /**
     * Envoie un push à tous les appareils d'un utilisateur.
     *
     * @param  array<string,string>  $data  ex. ['route' => '/portail/finances']
     */
    public function sendToUser(User $user, string $title, string $body, array $data = []): void
    {
        $tokens = DeviceToken::where('user_id', $user->id)->get();
        if ($tokens->isEmpty()) {
            return;
        }

        $android = $tokens->where('platform', 'android')->pluck('token')->all();
        $ios = $tokens->where('platform', 'ios')->pluck('token')->all();

        if ($android && $this->fcmConfigured()) {
            foreach ($android as $token) {
                $this->sendFcm($token, $title, $body, $data);
            }
        }

        if ($ios && $this->apnsConfigured()) {
            foreach ($ios as $token) {
                $this->sendApns($token, $title, $body, $data);
            }
        }

        if (! $this->fcmConfigured() && ! $this->apnsConfigured()) {
            Log::debug('NativePushService: aucun provider configuré, push ignoré', ['user_id' => $user->id]);
        }
    }

    // ─── FCM (Android) — HTTP v1 ─────────────────────────────────────────────

    private function fcmConfigured(): bool
    {
        return config('services.fcm.project_id') && config('services.fcm.credentials');
    }

    private function sendFcm(string $token, string $title, string $body, array $data): void
    {
        try {
            $accessToken = $this->fcmAccessToken();
            $projectId = config('services.fcm.project_id');

            $resp = Http::withToken($accessToken)
                ->post("https://fcm.googleapis.com/v1/projects/{$projectId}/messages:send", [
                    'message' => [
                        'token' => $token,
                        'notification' => ['title' => $title, 'body' => $body],
                        'data' => array_map('strval', $data), // FCM exige des valeurs string
                    ],
                ]);

            if ($resp->failed()) {
                $this->handleInvalidToken($token, $resp->status());
                Log::warning('FCM push échoué', ['status' => $resp->status(), 'body' => $resp->body()]);
            }
        } catch (\Throwable $e) {
            Log::error('FCM push exception', ['error' => $e->getMessage()]);
        }
    }

    /** Jeton OAuth2 du compte de service Firebase (mis en cache ~55 min). */
    private function fcmAccessToken(): string
    {
        return Cache::remember('fcm_access_token', 3300, function () {
            $creds = json_decode((string) file_get_contents(config('services.fcm.credentials')), true);

            $jwt = $this->signJwt(
                ['alg' => 'RS256', 'typ' => 'JWT'],
                [
                    'iss' => $creds['client_email'],
                    'scope' => 'https://www.googleapis.com/auth/firebase.messaging',
                    'aud' => 'https://oauth2.googleapis.com/token',
                    'iat' => time(),
                    'exp' => time() + 3600,
                ],
                $creds['private_key'],
                'RS256',
            );

            $resp = Http::asForm()->post('https://oauth2.googleapis.com/token', [
                'grant_type' => 'urn:ietf:params:oauth:grant-type:jwt-bearer',
                'assertion' => $jwt,
            ]);

            return (string) $resp->json('access_token');
        });
    }

    // ─── APNs (iOS) — token-based (.p8, ES256) ───────────────────────────────

    private function apnsConfigured(): bool
    {
        return config('services.apns.key_id')
            && config('services.apns.team_id')
            && config('services.apns.bundle_id')
            && config('services.apns.key_path');
    }

    private function sendApns(string $token, string $title, string $body, array $data): void
    {
        try {
            $jwt = $this->signJwt(
                ['alg' => 'ES256', 'kid' => config('services.apns.key_id')],
                ['iss' => config('services.apns.team_id'), 'iat' => time()],
                (string) file_get_contents(config('services.apns.key_path')),
                'ES256',
            );

            $host = config('services.apns.production')
                ? 'https://api.push.apple.com'
                : 'https://api.sandbox.push.apple.com';

            $resp = Http::withHeaders([
                'authorization' => "bearer {$jwt}",
                'apns-topic' => config('services.apns.bundle_id'),
                'apns-push-type' => 'alert',
            ])->withOptions(['version' => 2.0]) // APNs exige HTTP/2
                ->post("{$host}/3/device/{$token}", [
                    'aps' => ['alert' => ['title' => $title, 'body' => $body], 'sound' => 'default'],
                    'data' => $data,
                ]);

            if ($resp->failed()) {
                $this->handleInvalidToken($token, $resp->status());
                Log::warning('APNs push échoué', ['status' => $resp->status(), 'body' => $resp->body()]);
            }
        } catch (\Throwable $e) {
            Log::error('APNs push exception', ['error' => $e->getMessage()]);
        }
    }

    /** Supprime un token devenu invalide (désinstallation, expiration). */
    private function handleInvalidToken(string $token, int $status): void
    {
        if (in_array($status, [404, 410], true)) {
            DeviceToken::where('token_hash', hash('sha256', $token))->delete();
        }
    }

    /** Signe un JWT (RS256 ou ES256) sans dépendance externe (openssl). */
    private function signJwt(array $header, array $payload, string $key, string $alg): string
    {
        $segments = [$this->b64(json_encode($header)), $this->b64(json_encode($payload))];
        $signingInput = implode('.', $segments);

        $signature = '';
        openssl_sign($signingInput, $signature, $key, OPENSSL_ALGO_SHA256);

        // ES256 : openssl renvoie une signature DER → JWT attend R||S (2×32 octets).
        if ($alg === 'ES256') {
            $signature = $this->derToRaw($signature);
        }

        return $signingInput.'.'.$this->b64($signature);
    }

    private function b64(string $data): string
    {
        return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
    }

    /** Convertit une signature ECDSA DER en concaténation brute R||S (64 octets). */
    private function derToRaw(string $der): string
    {
        $offset = 4;
        $rLen = ord($der[3]);
        $r = ltrim(substr($der, $offset, $rLen), "\x00");
        $offset += $rLen + 2;
        $sLen = ord($der[$offset - 1]);
        $s = ltrim(substr($der, $offset, $sLen), "\x00");

        return str_pad($r, 32, "\x00", STR_PAD_LEFT).str_pad($s, 32, "\x00", STR_PAD_LEFT);
    }
}
