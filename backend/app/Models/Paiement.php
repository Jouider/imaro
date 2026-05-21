<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Paiement extends Model
{
    use HasFactory;

    protected $fillable = [
        'tenant_id', 'exercice_id', 'coproprietaire_id', 'appel_fonds_ligne_id',
        'saisi_par', 'montant', 'mode', 'reference',
        'note', 'recu_pdf_path', 'date_paiement',
    ];

    protected function casts(): array
    {
        return [
            'montant' => 'float',
            'date_paiement' => 'date',
        ];
    }

    public function exercice(): BelongsTo
    {
        return $this->belongsTo(Exercice::class);
    }

    public function coproprietaire(): BelongsTo
    {
        return $this->belongsTo(Coproprietaire::class);
    }

    public function appelFondsLigne(): BelongsTo
    {
        return $this->belongsTo(AppelFondsLigne::class);
    }

    public function saisePar(): BelongsTo
    {
        return $this->belongsTo(User::class, 'saisi_par');
    }
}
