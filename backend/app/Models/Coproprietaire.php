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
    use HasFactory, LogsActivity, SoftDeletes;

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
        $this->update(['solde_actuel' => $this->soldeCalcule()]);
    }

    /**
     * Solde = (paiements alloués aux lignes + avances non allouées) − total dû.
     * Positif = créditeur (avance/trop-perçu), négatif = doit de l'argent.
     *
     * Les paiements rattachés à une ligne sont déjà dans `montant_paye` ; on ajoute
     * à part les paiements SANS ligne (virement validé d'un copro à jour, avance…)
     * pour qu'ils impactent le solde — sinon ils restent invisibles. Pas de double
     * comptage : `whereNull('appel_fonds_ligne_id')` exclut ceux déjà dans montant_paye.
     */
    public function soldeCalcule(): float
    {
        $du = (float) $this->appelsFondsLignes()->sum('montant_du');
        $payeAlloue = (float) $this->appelsFondsLignes()->sum('montant_paye');
        // Les chèques rejetés (KAN-85) ne comptent plus dans les avances.
        $avances = (float) $this->paiements()
            ->whereNull('appel_fonds_ligne_id')
            ->where(fn ($q) => $q->whereNull('statut')->orWhere('statut', '!=', 'cheque_rejete'))
            ->sum('montant');

        return round(($payeAlloue + $avances) - $du, 2);
    }
}
