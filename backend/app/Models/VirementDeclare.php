<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class VirementDeclare extends Model
{
    use HasFactory;

    protected $table = 'virements_declares';

    protected $fillable = [
        'tenant_id', 'residence_id', 'coproprietaire_id', 'montant', 'date_declaration',
        'methode', 'reference', 'justificatif_path', 'statut', 'motif_rejet',
        'valide_par', 'date_validation', 'paiement_id', 'validable_at',
    ];

    protected function casts(): array
    {
        return [
            'montant' => 'float',
            'date_declaration' => 'date',
            'date_validation' => 'datetime',
            'validable_at' => 'datetime',
        ];
    }

    /** Le délai légal de 24 h est-il écoulé (validation syndic autorisée) ? */
    public function estValidable(): bool
    {
        return $this->validable_at === null || now()->greaterThanOrEqualTo($this->validable_at);
    }

    public function coproprietaire(): BelongsTo
    {
        return $this->belongsTo(Coproprietaire::class);
    }

    public function residence(): BelongsTo
    {
        return $this->belongsTo(Residence::class);
    }

    public function validePar(): BelongsTo
    {
        return $this->belongsTo(User::class, 'valide_par');
    }

    public function paiement(): BelongsTo
    {
        return $this->belongsTo(Paiement::class);
    }
}
