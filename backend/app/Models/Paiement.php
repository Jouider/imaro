<?php

namespace App\Models;

use App\Models\Traits\LogsActivity;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Paiement extends Model
{
    use HasFactory, LogsActivity;

    protected $fillable = [
        'tenant_id', 'exercice_id', 'coproprietaire_id', 'appel_fonds_ligne_id',
        'saisi_par', 'montant', 'mode', 'reference',
        'statut', 'cheque_rejete_at', 'motif_rejet',
        'note', 'recu_pdf_path', 'date_paiement',
        'penalty_amount', 'penalty_calculated_at',
        'mise_en_demeure_sent_at', 'mise_en_demeure_pdf_url',
    ];

    protected function casts(): array
    {
        return [
            'montant' => 'float',
            'penalty_amount' => 'float',
            'date_paiement' => 'date',
            'cheque_rejete_at' => 'datetime',
            'penalty_calculated_at' => 'datetime',
            'mise_en_demeure_sent_at' => 'datetime',
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
