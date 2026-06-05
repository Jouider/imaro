<?php

namespace App\Notifications;

use App\Contracts\Notifications\NotificationChannel;
use App\Contracts\Notifications\NotificationMessage;
use App\Contracts\Notifications\NotificationProvider;
use App\Contracts\Notifications\NotificationResult;
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

    private function log(NotificationMessage $m, NotificationResult $r): void
    {
        DB::table('notifications_log')->insert([
            'tenant_id'       => $m->to->tenant_id,
            'user_id'         => $m->to->id,
            'canal'           => $m->channel->value,
            'template_name'   => $m->templateName,
            'content_preview' => mb_substr($m->body, 0, 200),
            'statut'          => $r->success ? 'envoye' : 'echec',
            'meta_message_id' => $r->providerMessageId,
            'error_message'   => $r->error,
            'sent_at'         => $r->success ? now() : null,
            'created_at'      => now(),
            'updated_at'      => now(),
        ]);
    }
}
