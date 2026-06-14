<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Historique des consentements CNDP (loi 09-08) — preuve opposable.
 */
class CndpConsent extends Model
{
    protected $fillable = [
        'tenant_id', 'user_id', 'policy_version', 'consented_at', 'ip', 'user_agent',
    ];

    protected function casts(): array
    {
        return ['consented_at' => 'datetime'];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
