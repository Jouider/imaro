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
            'montant_prevu'   => $this->montant_prevu,
            'montant_realise' => $this->montant_realise,
        ];
    }
}
