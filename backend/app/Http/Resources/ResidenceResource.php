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
            'id' => $this->id,
            'name' => $this->name,
            'address' => $this->address,
            'city' => $this->city,
            // FR aliases kept for backward compat with older clients
            'adresse' => $this->address,
            'ville' => $this->city,
            'photo' => $this->photo,
            'nb_lots' => $this->nb_lots,
            'total_tantieme' => $this->total_tantieme,
            'status' => $this->status,
            'taux_recouvrement' => $this->taux_recouvrement,
            'mode_cotisation' => $this->mode_cotisation,
            'montant_fixe' => $this->cotisation_mensuelle !== null
                ? (float) $this->cotisation_mensuelle
                : null,
            'cotisation_mensuelle' => $this->cotisation_mensuelle,
            'jour_echeance' => $this->jour_echeance,
            'periodicite_cotisation' => $this->periodicite_cotisation,
            'date_anniversaire' => $this->date_anniversaire?->toDateString(),
            'exercice_actif' => $exerciceActif ? [
                'id' => $exerciceActif->id,
                'annee' => $exerciceActif->annee,
                'statut' => $exerciceActif->statut,
            ] : null,
            'gestionnaire' => $this->when($this->gestionnaire, fn () => [
                'id' => $this->gestionnaire->id,
                'name' => $this->gestionnaire->name,
            ]),
            'groupes_habitations' => GroupeHabitationResource::collection($this->whenLoaded('groupesHabitations')),
            'immeubles' => ImmeubleResource::collection($this->whenLoaded('immeubles')),
            'lots' => LotResource::collection($this->whenLoaded('lots')),
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
