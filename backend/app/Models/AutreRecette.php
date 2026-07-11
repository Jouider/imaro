<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AutreRecette extends Model
{
    protected $table = 'autres_recettes';

    protected $fillable = [
        'tenant_id', 'residence_id', 'exercice', 'date',
        'libelle', 'categorie', 'montant', 'payeur', 'reference', 'notes',
    ];

    protected function casts(): array
    {
        return [
            'date' => 'date',
            'montant' => 'float',
        ];
    }

    public function residence(): BelongsTo
    {
        return $this->belongsTo(Residence::class);
    }
}
