<?php

namespace App\Models;

use App\Models\Traits\LogsActivity;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Coproprietaire extends Model
{
    use HasFactory, SoftDeletes, LogsActivity;

    protected $fillable = [
        'tenant_id', 'user_id', 'lot_id', 'type',
        'date_entree', 'solde_actuel',
    ];

    protected function casts(): array
    {
        return [
            'date_entree' => 'date',
            'solde_actuel' => 'float',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function lot(): BelongsTo
    {
        return $this->belongsTo(Lot::class);
    }

    public function appelsFondsLignes(): HasMany
    {
        return $this->hasMany(AppelFondsLigne::class);
    }

    public function paiements(): HasMany
    {
        return $this->hasMany(Paiement::class);
    }

    public function tickets(): HasMany
    {
        return $this->hasMany(Ticket::class, 'user_id', 'user_id');
    }

    public function recalculerSolde(): void
    {
        $du = $this->appelsFondsLignes()->sum('montant_du');
        $paye = $this->appelsFondsLignes()->sum('montant_paye');
        $this->update(['solde_actuel' => $paye - $du]);
    }
}
