<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class AppelFondsLigne extends Model
{
    use HasFactory;

    protected $table = 'appels_fonds_lignes';

    protected $fillable = [
        'appel_fonds_id', 'coproprietaire_id',
        'montant_du', 'montant_paye', 'statut', 'date_paiement',
    ];

    protected function casts(): array
    {
        return [
            'montant_du' => 'float',
            'montant_paye' => 'float',
            'date_paiement' => 'date',
        ];
    }

    public function appelFonds(): BelongsTo
    {
        return $this->belongsTo(AppelFonds::class);
    }

    public function coproprietaire(): BelongsTo
    {
        return $this->belongsTo(Coproprietaire::class);
    }

    public function paiements(): HasMany
    {
        return $this->hasMany(Paiement::class);
    }

    public function getMontantResteAttribute(): float
    {
        return round($this->montant_du - $this->montant_paye, 2);
    }
}
