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
        /**
         * True when delivery is confirmed reliable at send time. False when the
         * gateway only ACCEPTED the message and real delivery is unknown until a
         * webhook arrives (e.g. SMS8 personal-SIM relay → carrier may silently
         * drop it). A cascade must NOT stop on an unconfirmed success.
         */
        public readonly bool $confirmed = true,
    ) {}

    public static function ok(string $provider, ?string $messageId = null): self
    {
        return new self(true, $provider, $messageId, null);
    }

    /**
     * Accepted by the gateway but delivery NOT confirmed (no synchronous
     * delivery signal). Logged as "en_attente"; a delivery webhook later flips
     * it to "livre"/"echec". Does not terminate a cascade.
     */
    public static function accepted(string $provider, ?string $messageId = null): self
    {
        return new self(true, $provider, $messageId, null, false, false);
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
