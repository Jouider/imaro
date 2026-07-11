<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PushSubscription extends Model
{
    protected $fillable = [
        'user_id', 'tenant_id', 'endpoint', 'endpoint_hash', 'p256dh', 'auth', 'user_agent',
    ];

    protected static function booted(): void
    {
        static::saving(function (self $model) {
            $model->endpoint_hash = hash('sha256', $model->endpoint);
        });
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
