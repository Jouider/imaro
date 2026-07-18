<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Broadcast extends Model
{
    protected $fillable = [
        'title', 'message', 'target', 'target_value', 'channels',
        'scheduled_at', 'sent_at', 'recipients_count', 'created_by',
    ];

    protected function casts(): array
    {
        return [
            'channels' => 'array',
            'scheduled_at' => 'datetime',
            'sent_at' => 'datetime',
            'recipients_count' => 'integer',
        ];
    }
}
