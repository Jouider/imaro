<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class PaiementResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'montant' => $this->montant,
            'mode' => $this->mode,
            'reference' => $this->reference,
            'note' => $this->note,
            'notes' => $this->note,
            'date_paiement' => $this->date_paiement?->toDateString(),
            'date' => $this->date_paiement?->toDateString(),
            'created_at' => $this->created_at?->toIso8601String(),
            'coproprietaire' => $this->when($this->relationLoaded('coproprietaire'), fn () => [
                'id' => $this->coproprietaire->id,
                'name' => $this->coproprietaire->user?->name,
                'phone' => $this->coproprietaire->user?->phone,
            ]),
            'lot' => $this->when($this->relationLoaded('coproprietaire'), fn () => [
                'id' => $this->coproprietaire->lot?->id,
                'numero' => $this->coproprietaire->lot?->numero,
            ]),
            'appel_fonds' => $this->when($this->relationLoaded('appelFondsLigne'), fn () => [
                'id' => $this->appelFondsLigne->appelFonds?->id,
                'reference' => $this->appelFondsLigne->appelFonds?->reference
                    ?? 'AF-'.date('Y').'-'.str_pad($this->appelFondsLigne->appel_fonds_id, 3, '0', STR_PAD_LEFT),
            ]),
            'ligne' => $this->when($this->relationLoaded('appelFondsLigne'), fn () => [
                'id' => $this->appelFondsLigne->id,
                'montant_du' => $this->appelFondsLigne->montant_du,
                'montant_paye' => $this->appelFondsLigne->montant_paye,
                'statut' => $this->appelFondsLigne->statut,
                'libelle' => $this->appelFondsLigne->appelFonds?->libelle,
            ]),
            'saisi_par' => $this->when($this->relationLoaded('saisePar'), fn () => [
                'id' => $this->saisePar->id,
                'name' => $this->saisePar->name,
            ]),
        ];
    }
}
