<?php

namespace App\Http\Requests\Gestionnaire;

use Illuminate\Foundation\Http\FormRequest;

class UpdateResidenceRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => ['sometimes', 'string', 'max:255'],
            'address' => ['sometimes', 'nullable', 'string', 'max:500'],
            'city' => ['sometimes', 'string', 'max:100'],
            'photo' => ['sometimes', 'nullable', 'string', 'max:500'],
            'status' => ['sometimes', 'in:active,archive'],
            'mode_cotisation' => ['sometimes', 'in:tantieme,fixe,categorie'],
            'montant_fixe' => ['sometimes', 'nullable', 'numeric', 'min:0'],
            'jour_echeance' => ['sometimes', 'nullable', 'integer', 'between:1,28'],
            'periodicite_cotisation' => ['sometimes', 'in:mensuel,trimestriel,semestriel,annuel'],
            'date_anniversaire' => ['sometimes', 'nullable', 'date'],
        ];
    }

    /**
     * Returns the validated payload mapped to DB columns
     * (montant_fixe → cotisation_mensuelle).
     */
    public function toModel(): array
    {
        $data = $this->validated();

        if (array_key_exists('montant_fixe', $data)) {
            $data['cotisation_mensuelle'] = $data['montant_fixe'];
            unset($data['montant_fixe']);
        }

        return $data;
    }
}
