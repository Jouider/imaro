<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Immeuble extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'tenant_id',
        'residence_id',
        'groupe_habitation_id',
        'nom',
        'adresse',
        'nb_etages',
        'nb_lots',
    ];

    protected function casts(): array
    {
        return [
            'nb_etages' => 'integer',
            'nb_lots'   => 'integer',
        ];
    }

    protected static function booted(): void
    {
        static::addGlobalScope('tenant', function (Builder $query) {
            if ($tenantId = config('app.tenant_id')) {
                $query->where('immeubles.tenant_id', $tenantId);
            }
        });
    }

    public function residence(): BelongsTo
    {
        return $this->belongsTo(Residence::class);
    }

    public function groupeHabitation(): BelongsTo
    {
        return $this->belongsTo(GroupeHabitation::class);
    }

    public function lots(): HasMany
    {
        return $this->hasMany(Lot::class);
    }
}
