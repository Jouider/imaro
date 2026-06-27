<?php

namespace App\Http\Requests\Gestionnaire;

use App\Models\Ticket;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreTicketRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'residence_id' => ['required', 'integer', 'exists:residences,id'],
            'lot_id'       => ['nullable', 'integer', 'exists:lots,id'],
            'categorie'    => ['required', Rule::in(Ticket::CATEGORIES)],
            'description'  => ['required', 'string', 'min:10', 'max:2000'],
            'priorite'     => ['required', 'in:urgent,normal,faible'],
            'images'       => ['nullable', 'array', 'max:5'],
            'images.*'     => ['image', 'mimes:jpeg,png,webp', 'max:5120'],
        ];
    }
}
