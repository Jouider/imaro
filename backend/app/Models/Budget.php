<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;



class Budget extends Model
{
    use HasFactory;

    protected $fillable = [
        'tenant_id', 'residence_id', 'groupe_habitation_id', 'exercice_id', 'statut', 'version', 'approuve_at',
    ];

    protected function casts(): array
    {
        return [
            'approuve_at' => 'datetime',
        ];
    }

    public function residence(): BelongsTo
    {
        return $this->belongsTo(Residence::class);
    }

    public function groupeHabitation(): BelongsTo
    {
        return $this->belongsTo(GroupeHabitation::class);
    }

    public function exercice(): BelongsTo
    {
        return $this->belongsTo(Exercice::class);
    }

    public function postes(): HasMany
    {
        return $this->hasMany(PosteBudgetaire::class);
    }

    public function lignes(): HasMany
    {
        return $this->hasMany(LigneBudget::class)->orderBy('ordre');
    }
}
