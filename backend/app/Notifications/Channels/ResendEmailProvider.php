<?php

namespace App\Notifications\Channels;

use App\Contracts\Notifications\NotificationChannel;
use App\Contracts\Notifications\NotificationMessage;
use App\Contracts\Notifications\NotificationProvider;
use App\Contracts\Notifications\NotificationResult;
use Illuminate\Support\Facades\Log;
use Resend;
use Throwable;

/** Resend — 3000 free emails/mois. Pro plan ($20) when volume exceeds free tier. */
class ResendEmailProvider implements NotificationProvider
{
    public function __construct(
        private readonly ?string $apiKey,
        private readonly string $domain,
        private readonly ?string $fallbackFrom,
    ) {}

    /**
     * From-address per tenant: `{tenant.subdomain}@{domain}` (e.g. blanca@imaro.ma).
     * One Resend domain verification (imaro.ma) covers every tenant — no per-client setup.
     * Falls back to the configured global address if the user has no tenant.
     */
    private function resolveFrom(NotificationMessage $message): string
    {
        $subdomain = $message->to->tenant?->subdomain;

        if ($subdomain) {
            return $subdomain.'@'.$this->domain;
        }

        return $this->fallbackFrom ?? 'no-reply@'.$this->domain;
    }

    public function name(): string
    {
        return 'resend';
    }

    public function channel(): NotificationChannel
    {
        return NotificationChannel::Email;
    }

    public function send(NotificationMessage $message): NotificationResult
    {
        $from = $this->resolveFrom($message);

        if (! $this->apiKey) {
            Log::channel('stack')->info('[RESEND SIMULATED]', [
                'from'    => $from,
                'to'      => $message->to->email,
                'subject' => $message->subject,
                'body'    => $message->body,
            ]);

            return NotificationResult::ok($this->name(), 'simulated:'.uniqid());
        }

        try {
            $client = Resend::client($this->apiKey);
            $sent = $client->emails->send([
                'from'    => $from,
                'to'      => [$message->to->email],
                'subject' => $message->subject ?? '(no subject)',
                'html'    => nl2br(e($message->body)),
            ]);

            return NotificationResult::ok($this->name(), $sent->id ?? null);
        } catch (Throwable $e) {
            return NotificationResult::fail($this->name(), $e->getMessage());
        }
    }
}
