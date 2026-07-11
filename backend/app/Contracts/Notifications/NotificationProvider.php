<?php

namespace App\Contracts\Notifications;

/**
 * Unified provider contract. Implementations wrap one vendor (Twilio, SMS8,
 * Resend, Meta Cloud API, etc.) and expose a single send() entry point.
 *
 * The NotificationManager picks providers via config/notifications.php and
 * falls back through the chain on failure — switching vendor = config change.
 */
interface NotificationProvider
{
    /** Stable identifier used in logs and the notifications_log table. */
    public function name(): string;

    /** Which channel this provider serves. */
    public function channel(): NotificationChannel;

    /** Send synchronously. Must NOT throw — wrap errors in NotificationResult. */
    public function send(NotificationMessage $message): NotificationResult;
}
