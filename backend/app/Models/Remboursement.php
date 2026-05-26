<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Remboursement extends Model
{
    protected $fillable = [
        'tenant_id', 'residence_id', 'coproprietaire_id', 'coproprietaire_nom',
        'lot_numero', 'motif', 'description', 'montant',
        'date_demande', 'date_paiement', 'mode_paiement', 'reference', 'statut',
    ];

    protected function casts(): array
    {
        return [
            'montant' => 'float',
            'date_demande' => 'date',
            'date_paiement' => 'date',
        ];
    }

    public function residence(): BelongsTo
    {
        return $this->belongsTo(Residence::class);
    }

    public function coproprietaire(): BelongsTo
    {
        return $this->belongsTo(Coproprietaire::class);
    }
}
