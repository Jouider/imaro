<?php

namespace App\Contracts\Notifications;

final class NotificationResult
{
    public function __construct(
        public readonly bool $success,
        public readonly string $provider,
        public readonly ?string $providerMessageId = null,
        public readonly ?string $error = null,
        /** True when the send was intentionally skipped (muted by user prefs). */
        public readonly bool $skipped = false,
    ) {}

    public static function ok(string $provider, ?string $messageId = null): self
    {
        return new self(true, $provider, $messageId, null);
    }

    public static function fail(string $provider, string $error): self
    {
        return new self(false, $provider, null, $error);
    }

    /**
     * Recipient muted this category in notification_prefs — not an error,
     * not a send. Logged with statut "skipped".
     */
    public static function skipped(string $reason): self
    {
        return new self(false, 'muted', null, $reason, true);
    }
}
