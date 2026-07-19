<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * KAN-147 — trace d'une session de dépannage (impersonation).
 */
class ImpersonationSession extends Model
{
    protected $fillable = [
        'admin_id', 'tenant_id', 'impersonated_user_id', 'token_id',
        'started_at', 'expires_at', 'ended_at', 'ended_by', 'ip_address',
    ];

    protected function casts(): array
    {
        return [
            'started_at' => 'datetime',
            'expires_at' => 'datetime',
            'ended_at' => 'datetime',
        ];
    }

    public function admin(): BelongsTo
    {
        return $this->belongsTo(User::class, 'admin_id');
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    public function impersonatedUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'impersonated_user_id');
    }

    /** Session encore utilisable ? (ni révoquée, ni expirée) */
    public function isActive(): bool
    {
        return $this->ended_at === null
            && ($this->expires_at === null || $this->expires_at->isFuture());
    }
}
