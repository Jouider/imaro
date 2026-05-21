<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PosteBudgetaire extends Model
{
    use HasFactory;

    protected $table = 'postes_budgetaires';

    protected $fillable = [
        'budget_id', 'categorie', 'description', 'montant_prevu', 'montant_realise',
    ];

    protected function casts(): array
    {
        return [
            'montant_prevu'    => 'float',
            'montant_realise'  => 'float',
        ];
    }

    public function budget(): BelongsTo
    {
        return $this->belongsTo(Budget::class);
    }
}
