<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class LigneBudget extends Model
{
    protected $table = 'lignes_budget';

    protected $fillable = [
        'budget_id',
        'compte_pcg',
        'libelle',
        'type',
        'realise_n1',
        'budget_n',
        'engagement',
        'realise',
        'ordre',
    ];

    protected function casts(): array
    {
        return [
            'realise_n1'  => 'decimal:2',
            'budget_n'    => 'decimal:2',
            'engagement'  => 'decimal:2',
            'realise'     => 'decimal:2',
            'ordre'       => 'integer',
        ];
    }

    public function budget(): BelongsTo
    {
        return $this->belongsTo(Budget::class);
    }

    public function getPctConsommeAttribute(): int
    {
        if ($this->budget_n <= 0) {
            return 0;
        }

        return (int) round(($this->realise / $this->budget_n) * 100);
    }
}
