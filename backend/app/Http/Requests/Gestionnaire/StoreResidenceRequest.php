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
            'name' => ['required', 'string', 'max:255'],
            'address' => ['nullable', 'string', 'max:500'],
            'city' => ['required', 'string', 'max:100'],
            'mode_cotisation' => ['required', 'in:tantieme,fixe,categorie'],
            'montant_fixe' => ['nullable', 'required_if:mode_cotisation,fixe', 'numeric', 'min:0'],
            'jour_echeance' => ['nullable', 'integer', 'between:1,28'],
            'periodicite_cotisation' => ['nullable', 'in:mensuel,trimestriel,semestriel,annuel'],
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
        // Défaut explicite (sinon l'instance créée renvoie null avant rechargement DB).
        $data['periodicite_cotisation'] = $data['periodicite_cotisation'] ?? 'trimestriel';
        unset($data['montant_fixe']);

        return $data;
    }
}
