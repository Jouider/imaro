<?php

namespace App\Http\Requests\Gestionnaire;

use Illuminate\Foundation\Http\FormRequest;

class StoreLotRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'numero' => ['required', 'string', 'max:20'],
            'type' => ['required', 'in:appartement,local_commercial,parking,cave'],
            'etage' => ['required', 'integer', 'min:0', 'max:50'],
            'superficie' => ['nullable', 'numeric', 'min:1', 'max:9999'],
            'tantieme' => ['required', 'numeric', 'min:0.01', 'max:1000'],
        ];
    }
}
