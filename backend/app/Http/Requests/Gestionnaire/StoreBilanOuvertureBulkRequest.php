<?php

namespace App\Http\Requests\Gestionnaire;

use Illuminate\Foundation\Http\FormRequest;

class StoreBilanOuvertureBulkRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'exercice_id'                => 'required|integer|exists:exercices,id',
            'lignes'                     => 'required|array|min:1',
            'lignes.*.numero_compte'     => ['required', 'string', 'max:10', 'regex:/^[1-5]/'],
            'lignes.*.libelle'           => 'required|string|max:255',
            'lignes.*.solde_debit'       => 'nullable|numeric|min:0',
            'lignes.*.solde_credit'      => 'nullable|numeric|min:0',
        ];
    }

    public function messages(): array
    {
        return [
            'lignes.*.numero_compte.regex' => 'Le numéro de compte doit commencer par 1 à 5 (comptes de bilan uniquement).',
        ];
    }

    public function withValidator($validator): void
    {
        $validator->after(function ($validator) {
            foreach ($this->input('lignes', []) as $i => $ligne) {
                $debit  = (float) ($ligne['solde_debit'] ?? 0);
                $credit = (float) ($ligne['solde_credit'] ?? 0);

                if ($debit == 0 && $credit == 0) {
                    $validator->errors()->add("lignes.{$i}", 'Au moins un solde (débit ou crédit) doit être non nul.');
                }
                if ($debit > 0 && $credit > 0) {
                    $validator->errors()->add("lignes.{$i}", 'Un compte ne peut pas avoir un solde débit et crédit en même temps.');
                }
            }
        });
    }
}
