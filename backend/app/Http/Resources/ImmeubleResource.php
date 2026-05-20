<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ImmeubleResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'                    => $this->id,
            'nom'                   => $this->nom,
            'adresse'               => $this->adresse,
            'nb_etages'             => $this->nb_etages,
            'nb_lots'               => $this->nb_lots,
            'groupe_habitation_id'  => $this->groupe_habitation_id,
            'groupe_habitation'     => $this->when(
                $this->relationLoaded('groupeHabitation') && $this->groupeHabitation,
                fn () => [
                    'id'  => $this->groupeHabitation->id,
                    'nom' => $this->groupeHabitation->nom,
                ]
            ),
            'lots'                  => LotResource::collection($this->whenLoaded('lots')),
        ];
    }
}
