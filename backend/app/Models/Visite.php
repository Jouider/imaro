<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Str;

/**
 * KAN-102 — visite attendue déclarée par un résident, scannée par un agent.
 */
class Visite extends Model
{
    protected $fillable = [
        'tenant_id', 'residence_id', 'lot_id', 'coproprietaire_id', 'declarant_user_id',
        'resident_nom', 'lot_numero', 'visiteur_nom', 'motif', 'date_visite',
        'qr_token', 'statut', 'scanned_at', 'scanned_by',
    ];

    protected function casts(): array
    {
        return [
            'date_visite' => 'date',
            'scanned_at' => 'datetime',
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

    /** Jeton opaque encodé dans le QR (unique). */
    public static function generateToken(): string
    {
        do {
            $token = Str::lower(Str::random(40));
        } while (static::withoutGlobalScope('tenant')->where('qr_token', $token)->exists());

        return $token;
    }

    public function residence(): BelongsTo
    {
        return $this->belongsTo(Residence::class);
    }

    public function lot(): BelongsTo
    {
        return $this->belongsTo(Lot::class);
    }

    public function coproprietaire(): BelongsTo
    {
        return $this->belongsTo(Coproprietaire::class);
    }
}
