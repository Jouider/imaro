<?php

namespace App\Jobs;

use App\Contracts\Notifications\NotificationChannel;
use App\Contracts\Notifications\NotificationMessage;
use App\Models\User;
use App\Notifications\NotificationManager;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

/**
 * Async wrapper around NotificationManager::send(). Every business notification
 * (appel de fonds, relances, annonces…) goes through the queue so a slow
 * provider (Twilio/SMS8) or a bulk fan-out never blocks the API request.
 *
 * Scalar fields are stored rather than the whole NotificationMessage DTO so the
 * recipient is serialized via SerializesModels (model reference, not a frozen
 * snapshot) and re-fetched fresh on the worker.
 */
class SendNotificationJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;

    public int $backoff = 30;

    public function __construct(
        public readonly User $to,
        public readonly NotificationChannel $channel,
        public readonly string $templateName,
        public readonly string $body,
        public readonly ?string $subject = null,
        public readonly array $meta = [],
        public readonly ?string $category = null,
        public readonly bool $force = false,
    ) {}

    public function handle(NotificationManager $manager): void
    {
        $manager->send(new NotificationMessage(
            to:           $this->to,
            channel:      $this->channel,
            templateName: $this->templateName,
            body:         $this->body,
            subject:      $this->subject,
            meta:         $this->meta,
            category:     $this->category,
            force:        $this->force,
        ));
    }
}
