<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ContratResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $joursAvantExpiration = $this->date_fin
            ? max(0, now()->diffInDays($this->date_fin, false))
            : null;

        return [
            'id'                       => $this->id,
            'titre'                    => $this->titre,
            'type_contrat'             => $this->type,
            'montant_annuel'           => $this->montant,
            'date_debut'               => $this->date_debut?->toDateString(),
            'date_fin'                 => $this->date_fin?->toDateString(),
            'statut'                   => $this->statut,
            'renouvellement_auto'      => (bool) $this->renouvellement_auto,
            'jours_avant_expiration'   => $joursAvantExpiration,
            'created_at'               => $this->created_at?->toIso8601String(),
            'residence'                => $this->when($this->relationLoaded('residence'), fn () => [
                'id'   => $this->residence->id,
                'name' => $this->residence->name,
            ]),
            'prestataire'              => $this->when($this->relationLoaded('prestataire'), fn () => [
                'id'        => $this->prestataire->id,
                'name'      => $this->prestataire->nom,
                'specialite'=> $this->prestataire->specialite,
            ]),
        ];
    }
}
