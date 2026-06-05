<?php

namespace App\Contracts\Notifications;

use App\Models\User;

final class NotificationMessage
{
    public function __construct(
        public readonly User $to,
        public readonly NotificationChannel $channel,
        public readonly string $templateName,
        public readonly string $body,
        public readonly ?string $subject = null,
        public readonly array $meta = [],
    ) {}
}
