<?php

namespace App\Notifications;

use App\Contracts\Notifications\NotificationMessage;
use App\Contracts\Notifications\NotificationProvider;
use App\Contracts\Notifications\NotificationResult;
use App\Jobs\SendNotificationJob;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * Picks the right provider per channel, falls back through the chain on
 * failure, and logs every attempt to notifications_log.
 *
 * Provider chains are defined in config/notifications.php — switching vendor
 * (SMS8 → Mediatel, Twilio WA → Meta Cloud API) is a config edit, not code.
 */
class NotificationManager
{
    /** @var array<string, list<NotificationProvider>> keyed by channel value */
    private array $chains = [];

    /** @param iterable<NotificationProvider> $providers */
    public function __construct(iterable $providers, private readonly array $chainOrder)
    {
        $byName = [];
        foreach ($providers as $p) {
            $byName[$p->name()] = $p;
        }

        foreach ($chainOrder as $channel => $names) {
            foreach ($names as $name) {
                if (isset($byName[$name])) {
                    $this->chains[$channel][] = $byName[$name];
                }
            }
        }
    }

    public function send(NotificationMessage $message): NotificationResult
    {
        if ($message->category !== null && ! $message->force && $this->isMuted($message)) {
            $result = NotificationResult::skipped('muted by prefs: '.$message->category);
            $this->log($message, $result);

            return $result;
        }

        $chain = $this->chains[$message->channel->value] ?? [];

        if ($chain === []) {
            $result = NotificationResult::fail('none', 'no provider configured for channel '.$message->channel->value);
            $this->log($message, $result);

            return $result;
        }

        $last = null;
        foreach ($chain as $provider) {
            $result = $provider->send($message);
            $this->log($message, $result);

            if ($result->success) {
                return $result;
            }

            Log::warning('[notif] provider failed, falling back', [
                'provider' => $provider->name(),
                'error'    => $result->error,
            ]);
            $last = $result;
        }

        return $last ?? NotificationResult::fail('none', 'all providers failed');
    }

    /**
     * Fan a logical notification out across several pre-rendered messages
     * (one per channel — bodies differ per channel: SMS is terse, WhatsApp is
     * template-bound, Email is long). Each goes through send() so prefs +
     * fallback + logging apply per channel.
     *
     * @param  iterable<NotificationMessage>  $messages
     * @return array<string, NotificationResult>  keyed by channel value
     */
    public function sendMany(iterable $messages): array
    {
        $results = [];
        foreach ($messages as $m) {
            $results[$m->channel->value] = $this->send($m);
        }

        return $results;
    }

    /**
     * Priority cascade: try each message in order, STOP at the first success.
     *
     * For credential/onboarding delivery the recipient must get the message on
     * exactly ONE channel — the most universal first — never all at once. The
     * caller passes channels in priority order (e.g. SMS → WhatsApp → Email);
     * within a channel the provider chain (sms8 → twilio_sms) still applies.
     *
     * @param  iterable<NotificationMessage>  $messages  ordered by priority
     */
    public function sendCascade(iterable $messages): NotificationResult
    {
        $last = null;
        foreach ($messages as $m) {
            $result = $this->send($m);
            if ($result->success) {
                return $result;
            }
            $last = $result;
        }

        return $last ?? NotificationResult::fail('none', 'no channel available for cascade');
    }

    /**
     * Dispatch one message to the queue (Horizon). Heavy sends (PDF, bulk
     * relances) must never run in the request cycle.
     */
    public function queue(NotificationMessage $message): void
    {
        SendNotificationJob::dispatch(
            $message->to,
            $message->channel,
            $message->templateName,
            $message->body,
            $message->subject,
            $message->meta,
            $message->category,
            $message->force,
        );
    }

    /** @param  iterable<NotificationMessage>  $messages */
    public function queueMany(iterable $messages): void
    {
        foreach ($messages as $m) {
            $this->queue($m);
        }
    }

    /** Opt-out model: a category is muted only when explicitly set to false. */
    private function isMuted(NotificationMessage $m): bool
    {
        $prefs = $m->to->notification_prefs ?? [];

        return ($prefs[$m->category] ?? true) === false;
    }

    private function log(NotificationMessage $m, NotificationResult $r): void
    {
        DB::table('notifications_log')->insert([
            'tenant_id'       => $m->to->tenant_id,
            'user_id'         => $m->to->id,
            'canal'           => $m->channel->value,
            'template_name'   => $m->templateName,
            'content_preview' => mb_substr($m->body, 0, 200),
            'statut'          => $r->skipped ? 'skipped' : ($r->success ? 'envoye' : 'echec'),
            'meta_message_id' => $r->providerMessageId,
            'error_message'   => $r->error,
            'sent_at'         => $r->success ? now() : null,
            'created_at'      => now(),
            'updated_at'      => now(),
        ]);
    }
}
