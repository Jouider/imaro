<?php

namespace App\Http\Requests\Gestionnaire;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateLotRequest extends FormRequest
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
        $residenceId = $this->route('residence')?->id;
        $lotId = $this->route('lot')?->id;

        return [
            'numero' => [
                'sometimes', 'string', 'max:20',
                // Unicité par résidence en ignorant le lot courant (KAN-40).
                Rule::unique('lots', 'numero')
                    ->where(fn ($q) => $q->where('residence_id', $residenceId))
                    ->ignore($lotId),
            ],
            'titre_foncier' => ['sometimes', 'string', 'max:100'],
            'type' => ['sometimes', 'in:appartement,local_commercial,commerce,parking,cave,bureau,autre'],
            'etage' => ['sometimes', 'integer', 'min:-5', 'max:50'],
            'superficie' => ['sometimes', 'nullable', 'numeric', 'min:1', 'max:9999'],
            'tantieme' => ['sometimes', 'numeric', 'min:0.01', 'max:1000'],
        ];
    }

    public function messages(): array
    {
        return [
            'numero.unique' => 'Ce numéro de lot existe déjà dans cette résidence.',
        ];
    }
}
