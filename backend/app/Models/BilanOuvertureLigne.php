<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class BilanOuvertureLigne extends Model
{
    protected $fillable = [
        'tenant_id', 'residence_id', 'exercice_id', 'created_by',
        'numero_compte', 'libelle', 'solde_debit', 'solde_credit',
    ];

    protected function casts(): array
    {
        return [
            'solde_debit' => 'float',
            'solde_credit' => 'float',
        ];
    }

    public function residence(): BelongsTo
    {
        return $this->belongsTo(Residence::class);
    }

    public function exercice(): BelongsTo
    {
        return $this->belongsTo(Exercice::class);
    }
}
