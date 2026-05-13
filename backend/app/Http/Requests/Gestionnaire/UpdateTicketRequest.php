<?php

namespace App\Http\Requests\Gestionnaire;

use Illuminate\Foundation\Http\FormRequest;

class UpdateTicketRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'statut' => ['sometimes', 'in:ouvert,en_cours,resolu,clos'],
            'priorite' => ['sometimes', 'in:urgent,normal,faible'],
            'prestataire_id' => ['sometimes', 'nullable', 'integer', 'exists:prestataires,id'],
            'cout_estime' => ['sometimes', 'nullable', 'numeric', 'min:0'],
            'cout_reel' => ['sometimes', 'nullable', 'numeric', 'min:0'],
            'note_satisfaction' => ['sometimes', 'nullable', 'integer', 'min:1', 'max:5'],
        ];
    }
}
