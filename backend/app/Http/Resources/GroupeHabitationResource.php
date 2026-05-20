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
            'description'    => $this->description,
            'total_tantieme' => $this->total_tantieme,
            'immeubles'      => ImmeubleResource::collection($this->whenLoaded('immeubles')),
        ];
    }
}
