<?php

namespace App\Models;

use App\Models\Traits\LogsActivity;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasManyThrough;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\SoftDeletes;

class Residence extends Model
{
    use HasFactory, LogsActivity, SoftDeletes;

    protected $fillable = [
        'tenant_id', 'gestionnaire_id', 'name', 'address',
        'city', 'photo', 'total_tantieme', 'nb_lots', 'status',
        'mode_cotisation', 'cotisation_mensuelle', 'jour_echeance', 'periodicite_cotisation',
        'date_anniversaire',
    ];

    protected function casts(): array
    {
        return [
            'date_anniversaire' => 'date',
        ];
    }

    /**
     * Fenêtre d'exercice (12 mois glissants) pour une année donnée (KAN-95) :
     * démarre au jour/mois de la date d'anniversaire ; à défaut, 1er janvier.
     *
     * @return array{0: string, 1: string} [date_debut, date_fin] (Y-m-d)
     */
    public function exerciceWindow(int $annee): array
    {
        if ($this->date_anniversaire) {
            $debut = $this->date_anniversaire->copy()->year($annee);
            $fin = $debut->copy()->addYear()->subDay();
        } else {
            $debut = Carbon::create($annee, 1, 1);
            $fin = Carbon::create($annee, 12, 31);
        }

        return [$debut->toDateString(), $fin->toDateString()];
    }

    protected static function booted(): void
    {
        static::addGlobalScope('tenant', function (Builder $query) {
            if ($tenantId = config('app.tenant_id')) {
                $query->where('tenant_id', $tenantId);
            }
        });
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    public function gestionnaire(): BelongsTo
    {
        return $this->belongsTo(User::class, 'gestionnaire_id');
    }

    public function exercices(): HasMany
    {
        return $this->hasMany(Exercice::class);
    }

    public function exerciceActif(): HasOne
    {
        return $this->hasOne(Exercice::class)->where('statut', 'actif')->latestOfMany('annee');
    }

    public function lots(): HasMany
    {
        return $this->hasMany(Lot::class);
    }

    public function appelsFonds(): HasMany
    {
        return $this->hasMany(AppelFonds::class);
    }

    public function tickets(): HasMany
    {
        return $this->hasMany(Ticket::class);
    }

    public function assemblees(): HasMany
    {
        return $this->hasMany(Assemblee::class);
    }

    public function groupesHabitations(): HasMany
    {
        return $this->hasMany(GroupeHabitation::class);
    }

    public function immeubles(): HasMany
    {
        return $this->hasMany(Immeuble::class);
    }

    public function lotsViaImmeubles(): HasManyThrough
    {
        return $this->hasManyThrough(Lot::class, Immeuble::class);
    }

    public function hasGroupesHabitations(): bool
    {
        return $this->groupesHabitations()->exists();
    }

    public function coproprietaires(): HasManyThrough
    {
        return $this->hasManyThrough(Coproprietaire::class, Lot::class);
    }

    public function getTauxRecouvrementAttribute(): float
    {
        $total = $this->appelsFonds()
            ->where('appels_fonds.statut', '!=', 'brouillon')
            ->join('appels_fonds_lignes', 'appels_fonds.id', '=', 'appels_fonds_lignes.appel_fonds_id')
            ->sum('appels_fonds_lignes.montant_du');

        $paye = $this->appelsFonds()
            ->where('appels_fonds.statut', '!=', 'brouillon')
            ->join('appels_fonds_lignes', 'appels_fonds.id', '=', 'appels_fonds_lignes.appel_fonds_id')
            ->sum('appels_fonds_lignes.montant_paye');

        return $total > 0 ? round(($paye / $total) * 100, 1) : 0;
    }
}
