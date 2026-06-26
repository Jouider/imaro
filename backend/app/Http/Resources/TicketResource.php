<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Facades\Storage;

class TicketResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'reference' => $this->reference,
            'categorie' => $this->categorie,
            'description' => $this->description,
            'priorite' => $this->priorite,
            'statut' => $this->statut,
            'cout_estime' => $this->cout_estime,
            'cout_reel' => $this->cout_reel,
            'note_satisfaction' => $this->note_satisfaction,
            'images' => collect($this->images ?? [])->map(
                fn ($path) => Storage::disk('public')->url($path)
            )->values()->all(),
            'closed_at' => $this->closed_at?->toIso8601String(),
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
            'residence' => $this->when($this->relationLoaded('residence'), fn () => [
                'id' => $this->residence->id,
                'name' => $this->residence->name,
                'city' => $this->residence->city,
            ]),
            'lot' => $this->when($this->relationLoaded('lot') && $this->lot, fn () => [
                'id' => $this->lot->id,
                'numero' => $this->lot->numero,
            ]),
            'user' => $this->when($this->relationLoaded('user'), fn () => [
                'id' => $this->user->id,
                'name' => $this->user->name,
                'phone' => $this->user->phone,
            ]),
            'prestataire' => $this->when(
                $this->relationLoaded('prestataire') && $this->prestataire,
                fn () => [
                    'id' => $this->prestataire->id,
                    'name' => $this->prestataire->name,
                ]
            ),
        ];
    }
}
