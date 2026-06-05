<?php

namespace App\Contracts\Notifications;

final class NotificationResult
{
    public function __construct(
        public readonly bool $success,
        public readonly string $provider,
        public readonly ?string $providerMessageId = null,
        public readonly ?string $error = null,
    ) {}

    public static function ok(string $provider, ?string $messageId = null): self
    {
        return new self(true, $provider, $messageId, null);
    }

    public static function fail(string $provider, string $error): self
    {
        return new self(false, $provider, null, $error);
    }
}
