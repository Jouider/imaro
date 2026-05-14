<?php

namespace App\Http\Requests\Gestionnaire;

use Illuminate\Foundation\Http\FormRequest;

class StoreTicketRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'residence_id' => ['required', 'integer', 'exists:residences,id'],
            'lot_id' => ['nullable', 'integer', 'exists:lots,id'],
            'categorie' => ['required', 'in:plomberie,electricite,ascenseur,proprete,securite,autre'],
            'description' => ['required', 'string', 'min:10', 'max:2000'],
            'priorite' => ['required', 'in:urgent,normal,faible'],
        ];
    }
}
