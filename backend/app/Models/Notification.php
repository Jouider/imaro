<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Notification extends Model
{
    protected $fillable = [
        'tenant_id', 'user_id', 'type', 'title', 'message', 'read', 'data',
    ];

    protected function casts(): array
    {
        return [
            'read' => 'boolean',
            'data' => 'array',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
