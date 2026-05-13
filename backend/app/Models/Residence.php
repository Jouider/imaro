<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Residence extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'tenant_id', 'gestionnaire_id', 'name', 'address',
        'city', 'photo', 'total_tantieme', 'nb_lots', 'status',
    ];

    protected static function booted(): void
    {
        static::addGlobalScope('tenant', function (Builder $query) {
            if ($tenantId = config('app.tenant_id')) {
                $query->where('tenant_id', $tenantId);
            }
        });
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    public function gestionnaire(): BelongsTo
    {
        return $this->belongsTo(User::class, 'gestionnaire_id');
    }

    public function lots(): HasMany
    {
        return $this->hasMany(Lot::class);
    }

    public function appelsFonds(): HasMany
    {
        return $this->hasMany(AppelFonds::class);
    }

    public function tickets(): HasMany
    {
        return $this->hasMany(Ticket::class);
    }

    public function assemblees(): HasMany
    {
        return $this->hasMany(Assemblee::class);
    }

    public function getTauxRecouvrementAttribute(): float
    {
        $total = $this->appelsFonds()
            ->where('appels_fonds.statut', '!=', 'brouillon')
            ->join('appels_fonds_lignes', 'appels_fonds.id', '=', 'appels_fonds_lignes.appel_fonds_id')
            ->sum('appels_fonds_lignes.montant_du');

        $paye = $this->appelsFonds()
            ->where('appels_fonds.statut', '!=', 'brouillon')
            ->join('appels_fonds_lignes', 'appels_fonds.id', '=', 'appels_fonds_lignes.appel_fonds_id')
            ->sum('appels_fonds_lignes.montant_paye');

        return $total > 0 ? round(($paye / $total) * 100, 1) : 0;
    }
}
