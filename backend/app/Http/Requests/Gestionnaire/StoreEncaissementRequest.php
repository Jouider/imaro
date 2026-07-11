<?php

namespace App\Http\Requests\Gestionnaire;

use Illuminate\Foundation\Http\FormRequest;

class StoreEncaissementRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'coproprietaire_id' => 'required|integer|exists:coproprietaires,id',
            'montant'           => 'required|numeric|min:0.01',
            'date'              => 'required|date',
            'reference'         => 'nullable|string|max:100',
            'appel_fonds_id'    => 'nullable|integer|exists:appels_fonds,id',
        ];
    }
}
