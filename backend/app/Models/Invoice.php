<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Facture d'abonnement d'un cabinet — back-office Digitoyou (KAN-140).
 */
class Invoice extends Model
{
    protected $fillable = [
        'tenant_id', 'numero', 'montant_dh', 'remise_pct', 'statut',
        'periode_label', 'date_emission', 'date_echeance', 'date_paiement',
    ];

    protected function casts(): array
    {
        return [
            'montant_dh' => 'integer',
            'remise_pct' => 'integer',
            'date_emission' => 'date',
            'date_echeance' => 'date',
            'date_paiement' => 'date',
        ];
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }
}
