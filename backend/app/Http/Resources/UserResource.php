<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class UserResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'            => $this->id,
            'name'          => $this->name,
            'phone'         => $this->phone,
            'email'         => $this->email,
            'role'          => $this->role,
            'lang'          => $this->lang,
            'avatar'        => $this->avatar,
            'status'        => $this->status,
            'last_login_at' => $this->last_login_at?->toIso8601String(),
            'tenant'        => $this->when($this->tenant, [
                'id'        => $this->tenant?->id,
                'name'      => $this->tenant?->name,
                'subdomain' => $this->tenant?->subdomain,
                'plan'      => $this->tenant?->plan,
            ]),
        ];
    }
}
