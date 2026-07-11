<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Equipement extends Model
{
    protected $fillable = [
        'tenant_id', 'residence_id', 'designation', 'categorie',
        'date_acquisition', 'valeur_acquisition', 'duree_amortissement_mois',
        'valeur_nette', 'notes', 'actif',
    ];

    protected function casts(): array
    {
        return [
            'date_acquisition' => 'date',
            'valeur_acquisition' => 'float',
            'valeur_nette' => 'float',
            'actif' => 'boolean',
        ];
    }

    public function residence(): BelongsTo
    {
        return $this->belongsTo(Residence::class);
    }
}
