<?php

namespace App\Notifications\Channels;

use App\Contracts\Notifications\NotificationChannel;
use App\Contracts\Notifications\NotificationMessage;
use App\Contracts\Notifications\NotificationProvider;
use App\Contracts\Notifications\NotificationResult;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Throwable;

/**
 * SMS8.io — economical Morocco SMS gateway (Phase 1 primary).
 * Migration trigger: > 3000 SMS/mois or any blocked SIM → swap for Mediatel.
 *
 * Endpoint: POST https://sms8.io/api/send
 *   key, sim, type=sms, phone, message
 */
class Sms8Provider implements NotificationProvider
{
    private const ENDPOINT = 'https://sms8.io/api/send';
    private const TIMEOUT_SECONDS = 10;

    public function __construct(
        private readonly ?string $apiKey,
        private readonly ?string $deviceId,
    ) {}

    public function name(): string
    {
        return 'sms8';
    }

    public function channel(): NotificationChannel
    {
        return NotificationChannel::Sms;
    }

    public function send(NotificationMessage $message): NotificationResult
    {
        if (! $this->apiKey || ! $this->deviceId) {
            Log::channel('stack')->info('[SMS8 SIMULATED]', [
                'to'   => $message->to->phone,
                'body' => $message->body,
            ]);

            return NotificationResult::ok($this->name(), 'simulated:'.uniqid());
        }

        try {
            $resp = Http::timeout(self::TIMEOUT_SECONDS)
                ->asForm()
                ->post(self::ENDPOINT, [
                    'key'     => $this->apiKey,
                    'sim'     => $this->deviceId,
                    'type'    => 'sms',
                    'phone'   => $message->to->phone,
                    'message' => $message->body,
                ]);

            $body = $resp->json();
            $success = $resp->successful() && (($body['success'] ?? false) === true);

            if (! $success) {
                return NotificationResult::fail(
                    $this->name(),
                    $body['error']['message'] ?? 'sms8 returned http '.$resp->status(),
                );
            }

            $id = $body['data']['messages'][0]['ID']
                ?? $body['data']['ID']
                ?? null;

            return NotificationResult::ok($this->name(), $id);
        } catch (Throwable $e) {
            return NotificationResult::fail($this->name(), $e->getMessage());
        }
    }
}
