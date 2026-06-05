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
        if (! $this->sid || ! $this->token || ! $this->from) {
            // No creds → simulated mode (local/CI). Caller can still proceed.
            Log::channel('stack')->info('[WA SIMULATED]', [
                'to'       => $message->to->phone,
                'template' => $message->templateName,
                'body'     => $message->body,
            ]);

            return NotificationResult::ok($this->name(), 'simulated:'.uniqid());
        }

        try {
            $client = new TwilioClient($this->sid, $this->token);
            $sent = $client->messages->create(
                'whatsapp:'.$message->to->phone,
                [
                    'from' => 'whatsapp:'.$this->from,
                    'body' => $message->body,
                ],
            );

            return NotificationResult::ok($this->name(), $sent->sid);
        } catch (Throwable $e) {
            return NotificationResult::fail($this->name(), $e->getMessage());
        }
    }
}
