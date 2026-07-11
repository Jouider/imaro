<?php

namespace App\Http\Requests\Auth;

use Illuminate\Foundation\Http\FormRequest;

class ResidentLoginRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'phone' => 'required|string',
            'code'  => 'required|string|min:6',
        ];
    }

    public function messages(): array
    {
        return [
            'phone.required' => 'Le numéro de téléphone est obligatoire.',
            'code.required'  => 'Le code d\'accès est obligatoire.',
        ];
    }
}
