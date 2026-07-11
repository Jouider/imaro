<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PointageLineMatch extends Model
{
    protected $fillable = [
        'session_id', 'bank_line_hash', 'target_type', 'target_id',
        'confirmed_at', 'confirmed_by',
    ];

    protected function casts(): array
    {
        return [
            'confirmed_at' => 'datetime',
        ];
    }

    public function session(): BelongsTo
    {
        return $this->belongsTo(PointageSession::class, 'session_id');
    }
}
