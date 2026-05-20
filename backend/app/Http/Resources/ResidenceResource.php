<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ResidenceResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $exerciceActif = $this->exercices?->firstWhere('statut', 'actif');

        return [
            'id'               => $this->id,
            'name'             => $this->name,
            'adresse'          => $this->address,
            'ville'            => $this->city,
            'photo'            => $this->photo,
            'nb_lots'          => $this->nb_lots,
            'total_tantieme'   => $this->total_tantieme,
            'taux_recouvrement'=> $this->taux_recouvrement,
            'exercice_actif'   => $exerciceActif ? [
                'id'     => $exerciceActif->id,
                'annee'  => $exerciceActif->annee,
                'statut' => $exerciceActif->statut,
            ] : null,
            'gestionnaire'     => $this->when($this->gestionnaire, fn () => [
                'id'   => $this->gestionnaire->id,
                'name' => $this->gestionnaire->name,
            ]),
            'mode_cotisation'       => $this->mode_cotisation,
            'cotisation_mensuelle'  => $this->cotisation_mensuelle,
            'groupes_habitations'   => GroupeHabitationResource::collection($this->whenLoaded('groupesHabitations')),
            'immeubles'             => ImmeubleResource::collection($this->whenLoaded('immeubles')),
            'lots'                  => LotResource::collection($this->whenLoaded('lots')),
            'created_at'            => $this->created_at?->toIso8601String(),
        ];
    }
}
