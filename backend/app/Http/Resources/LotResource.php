<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class LotResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'numero' => $this->numero,
            'titre_foncier' => $this->titre_foncier,
            'type' => $this->type,
            'etage' => $this->etage,
            'superficie' => $this->superficie,
            'tantieme' => $this->tantieme,
            'immeuble_id' => $this->immeuble_id,
            'immeuble' => $this->when(
                $this->relationLoaded('immeuble') && $this->immeuble,
                fn () => [
                    'id' => $this->immeuble->id,
                    'nom' => $this->immeuble->nom,
                ]
            ),
            'proprietaire' => $this->when(
                $this->relationLoaded('coproprietairePrincipal') && $this->coproprietairePrincipal,
                fn () => [
                    'id' => $this->coproprietairePrincipal->user->id ?? null,
                    'name' => $this->coproprietairePrincipal->user->name ?? null,
                ]
            ),
        ];
    }
}
