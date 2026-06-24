<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Journal d'audit des scans QR (check-in / check-out / rejected).
 */
class VisiteScanLog extends Model
{
    protected $fillable = [
        'tenant_id', 'visite_id', 'scanned_by_id', 'action', 'reason', 'scanned_at',
    ];

    protected function casts(): array
    {
        return ['scanned_at' => 'datetime'];
    }

    public function visite(): BelongsTo
    {
        return $this->belongsTo(Visite::class);
    }
}
