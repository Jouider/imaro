<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class PointageSession extends Model
{
    protected $fillable = [
        'tenant_id', 'residence_id', 'created_by',
        'banque', 'file_path', 'totals', 'lines',
    ];

    protected function casts(): array
    {
        return [
            'totals' => 'array',
            'lines' => 'array',
        ];
    }

    public function residence(): BelongsTo
    {
        return $this->belongsTo(Residence::class);
    }

    public function matches(): HasMany
    {
        return $this->hasMany(PointageLineMatch::class, 'session_id');
    }
}
