<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class PrestataireResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'               => $this->id,
            'name'             => $this->nom,
            'specialite'       => $this->specialite,
            'phone'            => $this->telephone,
            'email'            => $this->email,
            'adresse'          => $this->adresse ?? null,
            'note_satisfaction'=> $this->note_moyenne,
            'nb_interventions' => $this->nb_interventions,
            'statut'           => $this->statut,
            'created_at'       => $this->created_at?->toIso8601String(),
        ];
    }
}
