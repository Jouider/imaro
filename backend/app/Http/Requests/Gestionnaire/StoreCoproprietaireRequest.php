<?php

namespace App\Http\Requests\Gestionnaire;

use Illuminate\Foundation\Http\FormRequest;

class StoreCoproprietaireRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name'         => 'required|string|max:255',
            'phone'        => 'nullable|string|max:20|unique:users,phone',
            'email'        => 'nullable|email|max:255|unique:users,email',
            'lot_id'       => 'nullable|integer|exists:lots,id',
            'residence_id' => 'nullable|integer|exists:residences,id',
            'type'         => 'nullable|in:proprietaire,locataire',
            'date_entree'  => 'nullable|date',
        ];
    }

    public function withValidator($validator): void
    {
        $validator->after(function ($v) {
            if (! $this->lot_id && ! $this->residence_id) {
                $v->errors()->add('lot_id', 'lot_id ou residence_id est requis.');
            }
            if (! $this->phone && ! $this->email) {
                $v->errors()->add('phone', 'phone ou email est requis.');
            }
        });
    }
}
