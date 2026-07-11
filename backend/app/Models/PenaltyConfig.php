<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PenaltyConfig extends Model
{
    protected $fillable = [
        'residence_id', 'enabled', 'grace_period_days', 'rate_type',
        'rate_value', 'cap_max_montant', 'ag_approved_at', 'ag_id',
    ];

    protected function casts(): array
    {
        return [
            'enabled' => 'boolean',
            'grace_period_days' => 'integer',
            'rate_value' => 'float',
            'cap_max_montant' => 'float',
            'ag_approved_at' => 'date',
        ];
    }

    public function residence(): BelongsTo
    {
        return $this->belongsTo(Residence::class);
    }
}
