<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class CoproprietaireResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'type' => $this->type,
            'date_entree' => $this->date_entree?->toDateString(),
            'solde_actuel' => $this->solde_actuel,
            'user' => $this->when($this->relationLoaded('user'), fn () => [
                'id' => $this->user->id,
                'name' => $this->user->name,
                'phone' => $this->user->phone,
                'email' => $this->user->email,
            ]),
            'lot' => $this->when($this->relationLoaded('lot'), fn () => [
                'id' => $this->lot->id,
                'numero' => $this->lot->numero,
                'type' => $this->lot->type,
                'tantieme' => $this->lot->tantieme,
            ]),
        ];
    }
}
