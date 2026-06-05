<?php

namespace App\Contracts\Notifications;

enum NotificationChannel: string
{
    case Whatsapp = 'whatsapp';
    case Sms = 'sms';
    case Email = 'email';
}
