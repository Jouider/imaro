<?php

namespace App\Http\Requests\Gestionnaire;

use Illuminate\Foundation\Http\FormRequest;

class StorePaiementRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'appel_fonds_ligne_id' => ['required', 'integer', 'exists:appels_fonds_lignes,id'],
            'montant' => ['required', 'numeric', 'min:0.01'],
            'mode' => ['required', 'in:virement,cheque,especes,mobile'],
            'date_paiement' => ['required', 'date'],
            'reference' => ['nullable', 'string', 'max:100'],
            'note' => ['nullable', 'string', 'max:500'],
        ];
    }
}
