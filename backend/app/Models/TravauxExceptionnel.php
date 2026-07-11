<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TravauxExceptionnel extends Model
{
    protected $table = 'travaux_exceptionnels';

    protected $fillable = [
        'tenant_id', 'residence_id', 'libelle', 'description',
        'date_vote_ag', 'ag_id', 'prestataire',
        'montant_vote', 'montant_engage', 'montant_regle',
        'date_debut', 'date_fin_prevue', 'date_fin_reelle', 'statut',
    ];

    protected function casts(): array
    {
        return [
            'date_vote_ag' => 'date',
            'date_debut' => 'date',
            'date_fin_prevue' => 'date',
            'date_fin_reelle' => 'date',
            'montant_vote' => 'float',
            'montant_engage' => 'float',
            'montant_regle' => 'float',
        ];
    }

    public function residence(): BelongsTo
    {
        return $this->belongsTo(Residence::class);
    }

    public function assemblee(): BelongsTo
    {
        return $this->belongsTo(Assemblee::class, 'ag_id');
    }
}
