<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Contrat extends Model
{
    use HasFactory;

    protected $fillable = [
        'tenant_id', 'residence_id', 'prestataire_id',
        'titre', 'type', 'montant', 'date_debut', 'date_fin', 'statut', 'renouvellement_auto',
    ];

    protected function casts(): array
    {
        return [
            'date_debut'          => 'date',
            'date_fin'            => 'date',
            'montant'             => 'float',
            'renouvellement_auto' => 'boolean',
        ];
    }

    public function residence(): BelongsTo
    {
        return $this->belongsTo(Residence::class);
    }

    public function prestataire(): BelongsTo
    {
        return $this->belongsTo(Prestataire::class);
    }
}
