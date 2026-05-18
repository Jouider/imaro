<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Annonce extends Model
{
    use HasFactory;

    protected $fillable = [
        'tenant_id', 'residence_id', 'created_by',
        'titre', 'contenu', 'priorite', 'statut', 'publiee_at',
    ];

    protected function casts(): array
    {
        return [
            'publiee_at' => 'datetime',
        ];
    }

    public function residence(): BelongsTo
    {
        return $this->belongsTo(Residence::class);
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
