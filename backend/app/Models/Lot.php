<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\SoftDeletes;

class Lot extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'tenant_id', 'residence_id', 'immeuble_id', 'numero', 'etage',
        'type', 'superficie', 'tantieme',
    ];

    protected function casts(): array
    {
        return [
            'tantieme' => 'float',
            'superficie' => 'float',
        ];
    }

    public function residence(): BelongsTo
    {
        return $this->belongsTo(Residence::class);
    }

    public function immeuble(): BelongsTo
    {
        return $this->belongsTo(Immeuble::class);
    }

    public function coproprietaires(): HasMany
    {
        return $this->hasMany(Coproprietaire::class);
    }

    public function coproprietairePrincipal(): HasOne
    {
        return $this->hasOne(Coproprietaire::class)->where('type', 'proprietaire');
    }
}
