<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class AppelFonds extends Model
{
    use HasFactory;

    protected $table = 'appels_fonds';

    protected $fillable = [
        'tenant_id', 'residence_id', 'created_by', 'libelle',
        'description', 'montant_total', 'date_echeance', 'statut', 'sent_at',
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

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function lignes(): HasMany
    {
        return $this->hasMany(AppelFondsLigne::class);
    }

    /**
     * Génère les lignes automatiquement selon les tantièmes.
     * Règle : montant_du = montant_total × (tantieme / total_tantieme)
     */
    public function genererLignes(): void
    {
        $residence = $this->residence()->with('lots.coproprietaires')->first();

        foreach ($residence->lots as $lot) {
            foreach ($lot->coproprietaires as $copro) {
                $montantDu = round(
                    $this->montant_total * ($lot->tantieme / $residence->total_tantieme),
                    2
                );

                $this->lignes()->create([
                    'coproprietaire_id' => $copro->id,
                    'montant_du' => $montantDu,
                    'montant_paye' => 0,
                    'statut' => 'impaye',
                ]);
            }
        }
    }
}
