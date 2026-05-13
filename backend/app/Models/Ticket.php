<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Ticket extends Model
{
    use HasFactory;

    protected $fillable = [
        'tenant_id', 'residence_id', 'lot_id', 'user_id', 'prestataire_id',
        'categorie', 'description', 'priorite', 'statut',
        'cout_estime', 'cout_reel', 'note_satisfaction', 'images', 'closed_at',
    ];

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
}
