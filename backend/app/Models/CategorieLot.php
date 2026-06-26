<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * Catégorie de lot (KAN-93) : nom + cotisation, par résidence. Sert au mode de
 * cotisation « par catégorie » (montant_du d'un lot = cotisation de sa catégorie).
 */
class CategorieLot extends Model
{
    protected $table = 'categories_lot';

    protected $fillable = ['tenant_id', 'residence_id', 'nom', 'cotisation'];

    protected function casts(): array
    {
        return ['cotisation' => 'float'];
    }

    protected static function booted(): void
    {
        static::addGlobalScope('tenant', function (Builder $query) {
            if ($tenantId = config('app.tenant_id')) {
                $query->where('tenant_id', $tenantId);
            }
        });
    }

    public function residence(): BelongsTo
    {
        return $this->belongsTo(Residence::class);
    }

    public function lots(): HasMany
    {
        return $this->hasMany(Lot::class, 'categorie_lot_id');
    }
}
