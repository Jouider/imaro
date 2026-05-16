<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class AnnonceResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'         => $this->id,
            'titre'      => $this->titre,
            'contenu'    => $this->contenu,
            'priorite'   => $this->priorite,
            'statut'     => $this->statut,
            'date_publication' => $this->publiee_at?->toDateString(),
            'publiee_at'       => $this->publiee_at?->toIso8601String(),
            'date'             => ($this->publiee_at ?? $this->created_at)?->toIso8601String(),
            'nb_lectures'      => 0,  // TODO: implémenter table lectures_annonce (sprint 3)
            'created_at'       => $this->created_at?->toIso8601String(),
            'residence'  => $this->when($this->relationLoaded('residence') && $this->residence, fn () => [
                'id'   => $this->residence->id,
                'name' => $this->residence->name,
            ]),
        ];
    }
}
