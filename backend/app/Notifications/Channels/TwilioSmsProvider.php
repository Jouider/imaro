<?php

namespace App\Notifications\Channels;

use App\Contracts\Notifications\NotificationChannel;
use App\Contracts\Notifications\NotificationMessage;
use App\Contracts\Notifications\NotificationProvider;
use App\Contracts\Notifications\NotificationResult;
use Illuminate\Support\Facades\Log;
use Throwable;
use Twilio\Rest\Client as TwilioClient;

/** SMS fallback when SMS8 fails OR for international numbers (~10% expat users). */
class TwilioSmsProvider implements NotificationProvider
{
    public function __construct(
        private readonly ?string $sid,
        private readonly ?string $token,
        private readonly ?string $from,
    ) {}

    public function name(): string
    {
        return 'twilio_sms';
    }

    public function channel(): NotificationChannel
    {
        return NotificationChannel::Sms;
    }

    public function send(NotificationMessage $message): NotificationResult
    {
        if (! $this->sid || ! $this->token || ! $this->from) {
            Log::channel('stack')->info('[TWILIO-SMS SIMULATED]', [
                'to'   => $message->to->phone,
                'body' => $message->body,
            ]);

            return NotificationResult::ok($this->name(), 'simulated:'.uniqid());
        }

        try {
            $client = new TwilioClient($this->sid, $this->token);
            $sent = $client->messages->create(
                $message->to->phone,
                [
                    'from' => $this->from,
                    'body' => $message->body,
                ],
            );

            return NotificationResult::ok($this->name(), $sent->sid);
        } catch (Throwable $e) {
            return NotificationResult::fail($this->name(), $e->getMessage());
        }
    }
}
