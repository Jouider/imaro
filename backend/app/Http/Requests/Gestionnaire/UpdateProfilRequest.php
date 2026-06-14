<?php

namespace App\Http\Requests\Gestionnaire;

use Illuminate\Foundation\Http\FormRequest;

class UpdateProfilRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => 'sometimes|string|max:255',
            'notif_paiement' => 'sometimes|boolean',
            'notif_ticket' => 'sometimes|boolean',
            'notif_assemblee' => 'sometimes|boolean',
            'notif_retard' => 'sometimes|boolean',
            // Consentement CNDP (loi 09-08) — KAN-60
            'cndp_consent' => 'sometimes|boolean',
            'cndp_policy_version' => 'sometimes|string|max:20',
        ];
    }
}
