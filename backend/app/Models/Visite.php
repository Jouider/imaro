<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;

/**
 * Visite (laissez-passer QR) — cf. docs/feature-visites-backend-brief.md.
 * Cycle : planned → arrived → departed (+ expired/cancelled).
 */
class Visite extends Model
{
    protected $fillable = [
        'tenant_id', 'residence_id', 'qr_token', 'visitor_name', 'visitor_phone',
        'type', 'purpose', 'host_lot_id', 'host_user_id', 'planned_at', 'arrived_at',
        'left_at', 'status', 'photo_url', 'is_recurring', 'recurrence', 'created_by_id',
    ];

    protected function casts(): array
    {
        return [
            'planned_at' => 'datetime',
            'arrived_at' => 'datetime',
            'left_at' => 'datetime',
            'is_recurring' => 'boolean',
        ];
    }

    protected static function booted(): void
    {
        static::addGlobalScope('tenant', function (Builder $query) {
            if ($tenantId = config('app.tenant_id')) {
                $query->where('tenant_id', $tenantId);
            }
        });
    }

    /** Jeton opaque encodé dans le QR / l'URL publique /v/:token (unique). */
    public static function generateToken(): string
    {
        do {
            $token = 'vst_'.Str::lower(Str::random(18));
        } while (static::withoutGlobalScope('tenant')->where('qr_token', $token)->exists());

        return $token;
    }

    public function residence(): BelongsTo
    {
        return $this->belongsTo(Residence::class);
    }

    public function hostLot(): BelongsTo
    {
        return $this->belongsTo(Lot::class, 'host_lot_id');
    }

    public function hostUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'host_user_id');
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by_id');
    }

    public function scanLogs(): HasMany
    {
        return $this->hasMany(VisiteScanLog::class);
    }
}
