<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class AppelFondsResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $totalDu = $this->lignes->sum('montant_du');
        $totalPaye = $this->lignes->sum('montant_paye');

        return [
            'id' => $this->id,
            'libelle' => $this->libelle,
            'description' => $this->description,
            'montant_total' => $this->montant_total,
            'date_echeance' => $this->date_echeance?->toDateString(),
            'statut' => $this->statut,
            'sent_at' => $this->sent_at?->toIso8601String(),
            'created_at' => $this->created_at?->toIso8601String(),
            'residence' => $this->when($this->relationLoaded('residence'), fn () => [
                'id' => $this->residence->id,
                'name' => $this->residence->name,
            ]),
            'created_by' => $this->when($this->relationLoaded('createdBy'), fn () => [
                'id' => $this->createdBy->id,
                'name' => $this->createdBy->name,
            ]),
            'lignes_count' => $this->lignes->count(),
            'montant_recouvre' => round($totalPaye, 2),
            'montant_restant' => round($totalDu - $totalPaye, 2),
            'taux_recouvrement' => $totalDu > 0 ? round(($totalPaye / $totalDu) * 100, 1) : 0,
            'lignes' => AppelFondsLigneResource::collection($this->whenLoaded('lignesDetail')),
        ];
    }
}
