<?php

namespace App\Http\Requests\Gestionnaire;

use Illuminate\Foundation\Http\FormRequest;

class StoreAppelFondsRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            // Le frontend envoie 'titre', le backend stocke sous 'libelle'
            'titre'        => ['required_without:libelle', 'string', 'max:255'],
            'libelle'      => ['required_without:titre', 'string', 'max:255'],
            'description'  => ['nullable', 'string', 'max:1000'],
            'residence_id' => ['required', 'integer', 'exists:residences,id'],
            'exercice_id'  => ['nullable', 'integer', 'exists:exercices,id'],
            'montant_total'=> ['required', 'numeric', 'min:1'],
            'date_echeance'=> ['required', 'date'],
        ];
    }
}
