<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Bon de paiement émis par un résident (KAN-110 / #322).
 * Statuts : en_attente → valide | rejete (| expire). Validation possible
 * seulement après validable_at (now + 24 h).
 */
class BonPaiement extends Model
{
    use HasFactory;

    protected $table = 'bons_paiement';

    protected $fillable = [
        'tenant_id', 'residence_id', 'coproprietaire_id', 'reference',
        'compte_emetteur', 'beneficiaire', 'montant', 'motif', 'statut',
        'validable_at', 'validated_at', 'valide_par', 'motif_rejet',
        'ticket_id', 'pdf_path',
    ];

    protected static function booted(): void
    {
        // Référence lisible unique (BP-{année}-{id ≥3 chiffres}), posée après
        // l'insert (l'id est alors connu) — même convention que les tickets (KAN-105).
        static::created(function (self $bon) {
            if (blank($bon->reference)) {
                $bon->reference = 'BP-'.($bon->created_at?->format('Y') ?? date('Y'))
                    .'-'.str_pad((string) $bon->id, 3, '0', STR_PAD_LEFT);
                $bon->saveQuietly();
            }
        });
    }

    protected function casts(): array
    {
        return [
            'montant' => 'float',
            'validable_at' => 'datetime',
            'validated_at' => 'datetime',
        ];
    }

    /** Le délai légal de 24 h est-il écoulé (validation autorisée) ? */
    public function estValidable(): bool
    {
        return $this->validable_at !== null && now()->greaterThanOrEqualTo($this->validable_at);
    }

    public function coproprietaire(): BelongsTo
    {
        return $this->belongsTo(Coproprietaire::class);
    }

    public function residence(): BelongsTo
    {
        return $this->belongsTo(Residence::class);
    }

    public function ticket(): BelongsTo
    {
        return $this->belongsTo(Ticket::class);
    }

    public function validePar(): BelongsTo
    {
        return $this->belongsTo(User::class, 'valide_par');
    }
}
