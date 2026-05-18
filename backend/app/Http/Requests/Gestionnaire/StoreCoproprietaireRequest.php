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
            'name'        => 'required|string|max:255',
            'phone'       => 'required|string|max:20|unique:users,phone',
            'email'       => 'nullable|email|max:255|unique:users,email',
            'lot_id'      => 'required|integer|exists:lots,id',
            'type'        => 'required|in:proprietaire,locataire',
            'date_entree' => 'nullable|date',
        ];
    }
}
