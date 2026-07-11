<?php

namespace App\Http\Requests\Auth;

use Illuminate\Foundation\Http\FormRequest;

class ResidentActivateRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'phone'     => 'required|string',
            'temp_code' => 'required|string',
            'new_code'  => 'required|string|min:6|confirmed',
        ];
    }

    public function messages(): array
    {
        return [
            'phone.required'              => 'Le numéro de téléphone est obligatoire.',
            'temp_code.required'          => 'Le code temporaire est obligatoire.',
            'new_code.required'           => 'Le nouveau code est obligatoire.',
            'new_code.min'                => 'Le code doit contenir au moins 6 caractères.',
            'new_code.confirmed'          => 'La confirmation du code ne correspond pas.',
        ];
    }
}
