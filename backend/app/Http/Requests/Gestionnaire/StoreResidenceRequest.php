<?php

namespace App\Http\Requests\Gestionnaire;

use Illuminate\Foundation\Http\FormRequest;

class StoreResidenceRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name'            => ['required', 'string', 'max:255'],
            'address'         => ['nullable', 'string', 'max:500'],
            'city'            => ['required', 'string', 'max:100'],
            'mode_cotisation' => ['required', 'in:tantieme,fixe'],
            'montant_fixe'    => ['nullable', 'required_if:mode_cotisation,fixe', 'numeric', 'min:0'],
            'jour_echeance'   => ['nullable', 'integer', 'between:1,28'],
        ];
    }

    /**
     * Returns the validated payload mapped to DB columns
     * (montant_fixe → cotisation_mensuelle).
     */
    public function toModel(): array
    {
        $data = $this->validated();

        $data['address'] = $data['address'] ?? '';
        $data['cotisation_mensuelle'] = $data['montant_fixe'] ?? null;
        unset($data['montant_fixe']);

        return $data;
    }
}
