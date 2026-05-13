<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Assemblee extends Model
{
    use HasFactory;

    protected $fillable = [
        'tenant_id', 'residence_id', 'created_by', 'titre',
        'date', 'lieu', 'ordre_du_jour', 'statut', 'quorum_atteint', 'pv_pdf_path',
    ];

    protected function casts(): array
    {
        return [
            'date' => 'datetime',
            'quorum_atteint' => 'boolean',
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

    public function votes(): HasMany
    {
        return $this->hasMany(VoteAg::class);
    }
}
