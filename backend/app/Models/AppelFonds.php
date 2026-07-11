<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class AppelFonds extends Model
{
    use HasFactory;

    protected $table = 'appels_fonds';

    protected $fillable = [
        'tenant_id', 'residence_id', 'groupe_habitation_id', 'exercice_id', 'created_by',
        'libelle', 'description', 'montant_total', 'date_echeance', 'statut', 'sent_at',
    ];

    protected function casts(): array
    {
        return [
            'date_echeance' => 'date',
            'sent_at' => 'datetime',
            'montant_total' => 'float',
        ];
    }

    protected static function booted(): void
    {
        static::addGlobalScope('tenant', function (Builder $query) {
            if ($tenantId = config('app.tenant_id')) {
                $query->where('appels_fonds.tenant_id', $tenantId);
            }
        });
    }

    public function residence(): BelongsTo
    {
        return $this->belongsTo(Residence::class);
    }

    public function groupeHabitation(): BelongsTo
    {
        return $this->belongsTo(GroupeHabitation::class);
    }

    public function exercice(): BelongsTo
    {
        return $this->belongsTo(Exercice::class);
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function lignes(): HasMany
    {
        return $this->hasMany(AppelFondsLigne::class);
    }

    /**
     * Génère les lignes automatiquement.
     *
     * Mode fixe  : montant_du = montant_total / nb_lots_scope
     * Mode tantieme : montant_du = montant_total × (tantieme / total_tantieme_scope)
     */
    public function genererLignes(): void
    {
        $lots = $this->getLotsInScope();
        $residence = $this->residence;
        $modeCotisation = $residence->mode_cotisation ?? 'tantieme';
        $nbLots = $lots->count();

        foreach ($lots as $lot) {
            foreach ($lot->coproprietaires as $copro) {
                if ($modeCotisation === 'categorie') {
                    // Chaque lot paie la cotisation de sa catégorie (KAN-93).
                    $montantDu = round((float) ($lot->categorieLot?->cotisation ?? 0), 2);
                } elseif ($modeCotisation === 'fixe') {
                    $montantDu = $nbLots > 0
                        ? round($this->montant_total / $nbLots, 2)
                        : 0;
                } else {
                    $totalTantieme = $this->getTotalTantiemeInScope();
                    $montantDu = $totalTantieme > 0
                        ? round($this->montant_total * ($lot->tantieme / $totalTantieme), 2)
                        : 0;
                }

                $this->lignes()->create([
                    'coproprietaire_id' => $copro->id,
                    'lot_id' => $lot->id,
                    'montant_du' => $montantDu,
                    'montant_paye' => 0,
                    'statut' => 'impaye',
                ]);
            }
        }
    }

    /**
     * Lots concernés : ceux du GH si défini, sinon tous les lots de la résidence.
     */
    private function getLotsInScope(): Collection
    {
        if ($this->groupe_habitation_id) {
            return Lot::whereHas('immeuble', function ($q) {
                $q->where('groupe_habitation_id', $this->groupe_habitation_id);
            })->with('coproprietaires', 'categorieLot')->get();
        }

        return Lot::where('residence_id', $this->residence_id)
            ->with('coproprietaires', 'categorieLot')
            ->get();
    }

    /**
     * Total tantième du scope (GH ou résidence).
     */
    private function getTotalTantiemeInScope(): float
    {
        if ($this->groupe_habitation_id && $this->groupeHabitation) {
            return (float) $this->groupeHabitation->total_tantieme;
        }

        return (float) ($this->residence->total_tantieme ?? 1000);
    }
}
