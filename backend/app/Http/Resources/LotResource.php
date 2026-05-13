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
            'type' => $this->type,
            'etage' => $this->etage,
            'superficie' => $this->superficie,
            'tantieme' => $this->tantieme,
            'coproprietaire' => $this->when(
                $this->relationLoaded('coproprietairePrincipal') && $this->coproprietairePrincipal,
                fn () => [
                    'id' => $this->coproprietairePrincipal->user->id ?? null,
                    'name' => $this->coproprietairePrincipal->user->name ?? null,
                    'phone' => $this->coproprietairePrincipal->user->phone ?? null,
                ]
            ),
        ];
    }
}
