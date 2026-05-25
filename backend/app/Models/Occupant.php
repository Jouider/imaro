<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Occupant extends Model
{
    protected $fillable = [
        'tenant_id', 'lot_id', 'coproprietaire_id', 'nom', 'telephone',
        'email', 'type', 'date_debut', 'date_fin',
        'contact_urgence_nom', 'contact_urgence_telephone', 'notes',
    ];

    protected function casts(): array
    {
        return [
            'date_debut' => 'date',
            'date_fin' => 'date',
        ];
    }

    protected static function booted(): void
    {
        static::addGlobalScope('tenant', function (Builder $query) {
            if ($tenantId = config('app.tenant_id')) {
                $query->where('occupants.tenant_id', $tenantId);
            }
        });
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
