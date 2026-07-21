<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AnnonceLike extends Model
{
    /** Pivot léger : seul created_at est géré. */
    public const UPDATED_AT = null;

    protected $fillable = [
        'annonce_id', 'user_id',
    ];

    public function annonce(): BelongsTo
    {
        return $this->belongsTo(Annonce::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
