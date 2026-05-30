<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class GroupeHabitationResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'             => $this->id,
            'nom'            => $this->nom,
            'code'           => $this->code,
            'residence_id'   => $this->residence_id,
            'description'    => $this->description,
            'total_tantieme' => $this->total_tantieme,
            'nb_immeubles'   => $this->immeubles_count ?? $this->whenLoaded('immeubles', fn () => $this->immeubles->count()),
            'immeubles'      => ImmeubleResource::collection($this->whenLoaded('immeubles')),
        ];
    }
}
