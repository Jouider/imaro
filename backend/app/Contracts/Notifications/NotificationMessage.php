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
        /**
         * Opt-out category matching a key in users.notification_prefs
         * (paiement|ticket|assemblee|retard). When set and the recipient has
         * disabled it, the manager skips the send. null = uncategorized
         * (transactional/security: OTP, onboarding) → always sent.
         */
        public readonly ?string $category = null,
        /**
         * Legal/mandatory message (mise en demeure Art. 25, convocation AG
         * Art. 16quinquies). Bypasses notification_prefs entirely.
         */
        public readonly bool $force = false,
    ) {}
}
