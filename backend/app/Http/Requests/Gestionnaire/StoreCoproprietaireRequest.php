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
            'name' => 'required|string|max:255',
            // No `unique` here: an existing copropriétaire (same cabinet) must be
            // re-usable on a new lot. The controller does find-or-link and returns
            // a clear 422 for a cross-tenant collision (phone/email are globally
            // unique at the DB level).
            'phone' => 'nullable|string|max:20',
            'email' => 'nullable|email|max:255',
            'lot_id' => 'nullable|integer|exists:lots,id',
            'residence_id' => 'nullable|integer|exists:residences,id',
            // KAN-114 — on ne gère plus que le copropriétaire (option « locataire » retirée).
            'type' => 'nullable|in:proprietaire',
            'date_entree' => 'nullable|date',
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
