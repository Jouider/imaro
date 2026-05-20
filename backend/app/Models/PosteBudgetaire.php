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
        'budget_id',
        'prestataire_id',
        'contrat_id',
        'categorie',
        'description',
        'nombre',
        'prix_unitaire',
        'cout_mensuel',
        'date_debut',
        'date_fin',
        'nb_mois',
        'montant_prevu',
        'montant_realise',
    ];

    protected function casts(): array
    {
        return [
            'nombre'          => 'integer',
            'prix_unitaire'   => 'float',
            'cout_mensuel'    => 'float',
            'montant_prevu'   => 'float',
            'montant_realise' => 'float',
            'nb_mois'         => 'integer',
            'date_debut'      => 'date',
            'date_fin'        => 'date',
        ];
    }

    public function budget(): BelongsTo
    {
        return $this->belongsTo(Budget::class);
    }

    public function prestataire(): BelongsTo
    {
        return $this->belongsTo(Prestataire::class);
    }

    public function contrat(): BelongsTo
    {
        return $this->belongsTo(Contrat::class);
    }
}
