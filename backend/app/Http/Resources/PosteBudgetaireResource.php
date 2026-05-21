<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class PosteBudgetaireResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'              => $this->id,
            'categorie'       => $this->categorie,
            'description'     => $this->description,
            'nombre'          => $this->nombre,
            'prix_unitaire'   => $this->prix_unitaire,
            'cout_mensuel'    => $this->cout_mensuel,
            'date_debut'      => $this->date_debut?->toDateString(),
            'date_fin'        => $this->date_fin?->toDateString(),
            'nb_mois'         => $this->nb_mois,
            'montant_prevu'   => $this->montant_prevu,
            'montant_realise' => $this->montant_realise,
            'prestataire'     => $this->when(
                $this->prestataire_id,
                fn () => [
                    'id'         => $this->prestataire?->id,
                    'nom'        => $this->prestataire?->nom,
                    'specialite' => $this->prestataire?->specialite,
                ]
            ),
            'contrat'         => $this->when(
                $this->contrat_id,
                fn () => [
                    'id'    => $this->contrat?->id,
                    'titre' => $this->contrat?->titre,
                    'type'  => $this->contrat?->type,
                ]
            ),
        ];
    }
}
