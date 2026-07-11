<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Emprunt extends Model
{
    protected $fillable = [
        'tenant_id', 'residence_id', 'libelle', 'organisme',
        'date_debut', 'date_fin', 'montant_initial', 'taux_interet',
        'duree_mois', 'mensualite', 'paye_cumule', 'paye_exercice',
        'reste', 'statut', 'notes',
    ];

    protected function casts(): array
    {
        return [
            'date_debut' => 'date',
            'date_fin' => 'date',
            'montant_initial' => 'float',
            'taux_interet' => 'float',
            'mensualite' => 'float',
            'paye_cumule' => 'float',
            'paye_exercice' => 'float',
            'reste' => 'float',
        ];
    }

    public function residence(): BelongsTo
    {
        return $this->belongsTo(Residence::class);
    }
}
