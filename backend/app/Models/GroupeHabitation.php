<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasManyThrough;
use Illuminate\Database\Eloquent\SoftDeletes;

class GroupeHabitation extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'groupes_habitations';

    protected $fillable = [
        'tenant_id',
        'residence_id',
        'nom',
        'description',
        'total_tantieme',
    ];

    protected function casts(): array
    {
        return [
            'total_tantieme' => 'float',
        ];
    }

    protected static function booted(): void
    {
        static::addGlobalScope('tenant', function (Builder $query) {
            if ($tenantId = config('app.tenant_id')) {
                $query->where('groupes_habitations.tenant_id', $tenantId);
            }
        });
    }

    public function residence(): BelongsTo
    {
        return $this->belongsTo(Residence::class);
    }

    public function immeubles(): HasMany
    {
        return $this->hasMany(Immeuble::class);
    }

    public function lots(): HasManyThrough
    {
        return $this->hasManyThrough(Lot::class, Immeuble::class);
    }

    public function exercices(): HasMany
    {
        return $this->hasMany(Exercice::class);
    }

    public function budgets(): HasMany
    {
        return $this->hasMany(Budget::class);
    }

    public function appelsFonds(): HasMany
    {
        return $this->hasMany(AppelFonds::class);
    }

    public function depenses(): HasMany
    {
        return $this->hasMany(Depense::class);
    }
}
