<?php

namespace App\Http\Resources;

use App\Models\BonPaiement;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Facades\Storage;

/**
 * Forme contractuelle d'un bon de paiement (KAN-110 / #322), alignée sur le front.
 *
 * @mixin BonPaiement
 */
class BonPaiementResource extends JsonResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'reference' => $this->reference,
            'compte_emetteur' => $this->compte_emetteur,
            'beneficiaire' => $this->beneficiaire,
            'montant' => round((float) $this->montant, 2),
            'motif' => $this->motif,
            'statut' => $this->statut,
            'created_at' => $this->created_at?->toIso8601String(),
            'validable_at' => $this->validable_at?->toIso8601String(),
            'validated_at' => $this->validated_at?->toIso8601String(),
            'ticket_reference' => $this->ticket?->reference,
            'pdf_url' => $this->pdf_path ? Storage::disk('public')->url($this->pdf_path) : null,
        ];
    }
}
