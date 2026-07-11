<?php

namespace App\Http\Requests\Gestionnaire;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreLotRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /** Normalise le numéro (trim) pour éviter les doublons « A-01 » vs « A-01 ». */
    protected function prepareForValidation(): void
    {
        if ($this->has('numero')) {
            $this->merge(['numero' => trim((string) $this->input('numero'))]);
        }
    }

    public function rules(): array
    {
        $residence = $this->route('residence');
        $residenceId = $residence?->id;
        // KAN-93 — en mode « catégorie », chaque lot doit avoir une catégorie.
        $categorieRequis = $residence?->mode_cotisation === 'categorie';

        return [
            'numero' => [
                'required', 'string', 'max:20',
                // Unicité autoritaire par résidence (KAN-40).
                Rule::unique('lots', 'numero')->where(fn ($q) => $q->where('residence_id', $residenceId)),
            ],
            // KAN-94 — titre foncier obligatoire.
            'titre_foncier' => ['required', 'string', 'max:100'],
            // KAN-93 — catégorie de lot (obligatoire en mode « par catégorie »).
            'categorie_lot_id' => [$categorieRequis ? 'required' : 'nullable', Rule::exists('categories_lot', 'id')->where('residence_id', $residenceId)],
            'type' => ['required', 'in:appartement,local_commercial,commerce,parking,cave,bureau,autre'],
            'etage' => ['required', 'integer', 'min:-5', 'max:50'],
            'superficie' => ['nullable', 'numeric', 'min:0', 'max:9999'],
            'tantieme' => ['required', 'numeric', 'min:0.01', 'max:1000'],
        ];
    }

    public function messages(): array
    {
        return [
            'numero.unique' => 'Ce numéro de lot existe déjà dans cette résidence.',
        ];
    }
}
