<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Facades\Storage;

class DocumentResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'        => $this->id,
            'nom'       => $this->nom,
            'type'      => $this->type,
            'date'      => $this->date?->toDateString(),
            'taille_ko' => $this->taille_ko,
            'url'       => Storage::disk('public')->url($this->file_path),
            'residence' => $this->when($this->relationLoaded('residence') && $this->residence, fn () => [
                'id'   => $this->residence->id,
                'name' => $this->residence->name,
            ]),
        ];
    }
}
