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
            'email'         => $this->email,
            'phone'         => $this->phone,
            'role'             => $this->role,
            'app_role'         => $this->app_role,
            'app_permissions'  => $this->app_permissions ?? [],
            'residence_ids'    => $this->equipe_residence_ids ?? [],
            'lang'             => $this->lang,
        ];
    }
}
