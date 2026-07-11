<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class CoproprietaireResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'    => $this->id,
            'name'  => $this->when($this->relationLoaded('user'), fn () => $this->user?->name),
            'phone' => $this->when($this->relationLoaded('user'), fn () => $this->user?->phone),
            'email' => $this->when($this->relationLoaded('user'), fn () => $this->user?->email),
            'solde' => $this->solde_actuel,
            'lot'   => $this->when($this->relationLoaded('lot') && $this->lot, fn () => [
                'id'      => $this->lot->id,
                'numero'  => $this->lot->numero,
                'type'    => $this->lot->type,
                'tantieme'=> $this->lot->tantieme,
            ]),
            'residence' => $this->when(
                $this->relationLoaded('lot') && $this->lot?->relationLoaded('residence') && $this->lot->residence,
                fn () => [
                    'id'   => $this->lot->residence->id,
                    'name' => $this->lot->residence->name,
                ]
            ),
        ];
    }
}
