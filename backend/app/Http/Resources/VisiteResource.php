<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Shape de visite attendue par le frontend (visites.service.ts).
 */
class VisiteResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $hostName = $this->hostUser?->name
            ?? $this->hostLot?->coproprietairePrincipal?->user?->name;

        return [
            'id' => $this->id,
            'residence_id' => $this->residence_id,
            'qr_token' => $this->qr_token,
            'visitor_name' => $this->visitor_name,
            'visitor_phone' => $this->visitor_phone,
            'type' => $this->type,
            'purpose' => $this->purpose,
            'host_lot_id' => $this->host_lot_id,
            'host_lot_numero' => $this->hostLot?->numero,
            'host_name' => $hostName,
            'planned_at' => $this->planned_at?->toIso8601String(),
            'arrived_at' => $this->arrived_at?->toIso8601String(),
            'left_at' => $this->left_at?->toIso8601String(),
            'status' => $this->status,
            'photo_url' => $this->photo_url,
            'is_recurring' => (bool) $this->is_recurring,
            'recurrence' => $this->recurrence,
            'created_by_name' => $this->createdBy?->name,
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
