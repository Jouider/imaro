<?php

namespace App\Http\Requests\Gestionnaire;

use Illuminate\Foundation\Http\FormRequest;

class StoreDepenseRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'description'    => 'required|string|max:255',
            'categorie'      => 'required|string|max:100',
            'montant'        => 'required|numeric|min:0.01',
            'date'           => 'required|date',
            'prestataire'    => 'nullable|string|max:255',
            'prestataire_id' => 'nullable|integer|exists:prestataires,id',
            'statut'         => 'nullable|in:paye,en_attente,annule',
            'justificatif'   => 'nullable|file|mimes:pdf,jpeg,jpg,png,webp|max:5120',
        ];
    }
}
