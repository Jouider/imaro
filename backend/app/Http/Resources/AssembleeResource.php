<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class AssembleeResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'           => $this->id,
            'titre'        => $this->titre,
            'type'         => $this->type,
            'date'         => $this->date?->toIso8601String(),
            'lieu'         => $this->lieu,
            'quorum_requis'  => $this->quorum_requis,
            'quorum_atteint'    => $this->quorum_atteint,
            // Le frontend attend 'convoquee' — on mappe 'planifiee' vers 'convoquee'
            'statut'            => $this->statut === 'planifiee' ? 'convoquee' : $this->statut,
            'participants_count'=> null,
            'ordre_du_jour' => $this->ordre_du_jour
                ? array_values(array_filter(explode("\n", $this->ordre_du_jour), fn ($l) => trim($l) !== ''))
                : [],
            'created_at'   => $this->created_at?->toIso8601String(),
            'residence'    => $this->when($this->relationLoaded('residence'), fn () => [
                'id'   => $this->residence->id,
                'name' => $this->residence->name,
            ]),
        ];
    }
}
