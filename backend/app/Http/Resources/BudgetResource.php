<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class BudgetResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $postes = $this->whenLoaded('postes');

        $montantPrevu    = $this->postes->sum('montant_prevu');
        $montantRealise  = $this->postes->sum('montant_realise');
        $tauxExecution   = $montantPrevu > 0 ? round(($montantRealise / $montantPrevu) * 100) : 0;

        return [
            'id'              => $this->id,
            'statut'          => $this->statut,
            'approuve_at'     => $this->approuve_at?->toIso8601String(),
            'total_prevu'     => $montantPrevu,
            'total_realise'   => $montantRealise,
            'taux_execution'  => $tauxExecution,
            'created_at'      => $this->created_at?->toIso8601String(),
            'residence'       => $this->when($this->relationLoaded('residence'), fn () => [
                'id'   => $this->residence->id,
                'name' => $this->residence->name,
            ]),
            'exercice'        => $this->when($this->relationLoaded('exercice'), fn () => [
                'id'    => $this->exercice->id,
                'annee' => $this->exercice->annee,
            ]),
            'postes'          => $postes
                ? PosteBudgetaireResource::collection($postes)
                : [],
        ];
    }
}
