<?php

namespace App\Http\Requests\Gestionnaire;

use Illuminate\Foundation\Http\FormRequest;

class UpdateLotRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'numero' => ['sometimes', 'string', 'max:20'],
            'type' => ['sometimes', 'in:appartement,local_commercial,commerce,parking,cave,bureau,autre'],
            'etage' => ['sometimes', 'integer', 'min:-5', 'max:50'],
            'superficie' => ['sometimes', 'nullable', 'numeric', 'min:1', 'max:9999'],
            'tantieme' => ['sometimes', 'numeric', 'min:0.01', 'max:1000'],
        ];
    }
}
