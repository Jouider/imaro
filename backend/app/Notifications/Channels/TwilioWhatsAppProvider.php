<?php

namespace App\Notifications\Channels;

use App\Contracts\Notifications\NotificationChannel;
use App\Contracts\Notifications\NotificationMessage;
use App\Contracts\Notifications\NotificationProvider;
use App\Contracts\Notifications\NotificationResult;
use Illuminate\Support\Facades\Log;
use Throwable;
use Twilio\Rest\Client as TwilioClient;

class TwilioWhatsAppProvider implements NotificationProvider
{
    public function __construct(
        private readonly ?string $sid,
        private readonly ?string $token,
        private readonly ?string $from,
    ) {}

    public function name(): string
    {
        return 'twilio_whatsapp';
    }

    public function channel(): NotificationChannel
    {
        return NotificationChannel::Whatsapp;
    }

    public function send(NotificationMessage $message): NotificationResult
    {
        // Meta requires an approved template (contentSid) for any message sent
        // outside the 24h customer-service window. Free-form `body` only lands
        // when the recipient messaged us in the last 24h. Callers pass the
        // resolved Content SID + variables through $message->meta.
        $contentSid = $message->meta['content_sid'] ?? null;
        $contentVariables = $message->meta['content_variables'] ?? [];

        if (! $this->sid || ! $this->token || ! $this->from) {
            // No creds → simulated mode (local/CI). Caller can still proceed.
            Log::channel('stack')->info('[WA SIMULATED]', [
                'to'          => $message->to->phone,
                'template'    => $message->templateName,
                'content_sid' => $contentSid,
                'body'        => $message->body,
            ]);

            return NotificationResult::ok($this->name(), 'simulated:'.uniqid());
        }

        try {
            $client = new TwilioClient($this->sid, $this->token);

            $payload = ['from' => $this->waAddress($this->from)];

            if ($contentSid) {
                $payload['contentSid'] = $contentSid;
                if ($contentVariables !== []) {
                    $payload['contentVariables'] = json_encode(
                        $contentVariables,
                        JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES,
                    );
                }
            } else {
                // Free-form fallback (in-window / dev). Will fail 63016 outside 24h.
                $payload['body'] = $message->body;
            }

            $sent = $client->messages->create($this->waAddress($message->to->phone), $payload);

            return NotificationResult::ok($this->name(), $sent->sid);
        } catch (Throwable $e) {
            return NotificationResult::fail($this->name(), $e->getMessage());
        }
    }

    /** Normalize to a `whatsapp:+E164` address, tolerant of an existing prefix. */
    private function waAddress(string $number): string
    {
        return str_starts_with($number, 'whatsapp:') ? $number : 'whatsapp:'.$number;
    }
}
