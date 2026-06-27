<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Ticket extends Model
{
    use HasFactory;

    /**
     * Catégories de réclamation/ticket (KAN-55). Source unique de vérité,
     * partagée par la validation résident, la validation gestionnaire et
     * l'enum DB `tickets.categorie`.
     *
     * @var array<int, string>
     */
    public const CATEGORIES = [
        'parties_communes', 'ascenseur', 'plomberie', 'electricite',
        'chauffage', 'securite', 'proprete', 'nuisances',
        'espaces_verts', 'parking', 'interphone', 'degat_eaux', 'autre',
    ];

    /**
     * Catégorie → libellé FR affiché (la table tickets n'a pas de colonne titre).
     *
     * @var array<string, string>
     */
    public const CATEGORIE_LABELS = [
        'parties_communes' => 'Parties communes',
        'ascenseur'        => 'Ascenseur',
        'plomberie'        => 'Eau / Plomberie',
        'electricite'      => 'Électricité',
        'chauffage'        => 'Chauffage / Climatisation',
        'securite'         => 'Sécurité',
        'proprete'         => 'Propreté / Nettoyage',
        'nuisances'        => 'Nuisances sonores',
        'espaces_verts'    => 'Espaces verts',
        'parking'          => 'Parking / Garage',
        'interphone'       => 'Interphone / Accès',
        'degat_eaux'       => 'Dégât des eaux',
        'autre'            => 'Autre',
    ];

    protected $fillable = [
        'tenant_id', 'reference', 'residence_id', 'lot_id', 'user_id', 'assigned_to', 'prestataire_id',
        'categorie', 'description', 'priorite', 'statut',
        'cout_estime', 'cout_reel', 'note_satisfaction', 'images', 'closed_at',
    ];

    protected static function booted(): void
    {
        // KAN-105 — référence lisible unique (TKT-{année}-{id ≥3 chiffres}),
        // posée après l'insert (l'id est alors connu), quelle que soit la voie de création.
        static::created(function (self $ticket) {
            if (blank($ticket->reference)) {
                $ticket->reference = 'TKT-'.($ticket->created_at?->format('Y') ?? date('Y'))
                    .'-'.str_pad((string) $ticket->id, 3, '0', STR_PAD_LEFT);
                $ticket->saveQuietly();
            }
        });
    }

    protected function casts(): array
    {
        return [
            'images' => 'array',
            'closed_at' => 'datetime',
        ];
    }

    public function residence(): BelongsTo
    {
        return $this->belongsTo(Residence::class);
    }

    public function lot(): BelongsTo
    {
        return $this->belongsTo(Lot::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function prestataire(): BelongsTo
    {
        return $this->belongsTo(Prestataire::class);
    }

    /** Gestionnaire assigné au ticket (KAN-88). */
    public function assignedTo(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_to');
    }
}
