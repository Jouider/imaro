<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ResidenceResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'address' => $this->address,
            'city' => $this->city,
            'photo' => $this->photo,
            'nb_lots' => $this->nb_lots,
            'total_tantieme' => $this->total_tantieme,
            'status' => $this->status,
            'taux_recouvrement' => $this->taux_recouvrement,
            'gestionnaire' => $this->when($this->gestionnaire, fn () => [
                'id' => $this->gestionnaire->id,
                'name' => $this->gestionnaire->name,
            ]),
            'lots' => LotResource::collection($this->whenLoaded('lots')),
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
