<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class AppelFondsLigneResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'montant_du' => $this->montant_du,
            'montant_paye' => $this->montant_paye,
            'montant_reste' => $this->montant_reste,
            'statut' => $this->statut,
            'date_paiement' => $this->date_paiement?->toDateString(),
            'coproprietaire' => $this->when($this->relationLoaded('coproprietaire'), fn () => [
                'id' => $this->coproprietaire->id,
                'user' => [
                    'id' => $this->coproprietaire->user?->id,
                    'name' => $this->coproprietaire->user?->name,
                    'phone' => $this->coproprietaire->user?->phone,
                ],
                'lot' => [
                    'id' => $this->coproprietaire->lot?->id,
                    'numero' => $this->coproprietaire->lot?->numero,
                    'tantieme' => $this->coproprietaire->lot?->tantieme,
                ],
            ]),
        ];
    }
}
