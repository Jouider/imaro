<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * Plan commercial (offre) — back-office Digitoyou (KAN-146). Global, sans tenant.
 */
class Plan extends Model
{
    protected $fillable = [
        'slug', 'name', 'price_dh', 'period',
        'quota_residences', 'quota_lots', 'quota_users',
        'features', 'is_active', 'ordre',
    ];

    protected function casts(): array
    {
        return [
            'price_dh' => 'integer',
            'quota_residences' => 'integer',
            'quota_lots' => 'integer',
            'quota_users' => 'integer',
            'features' => 'array',
            'is_active' => 'boolean',
            'ordre' => 'integer',
        ];
    }
}
