<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PaymentSession extends Model
{
    protected $fillable = [
        'session_id', 'tenant_id', 'user_id', 'coproprietaire_id',
        'montant', 'reference', 'gateway', 'gateway_ref', 'payment_url', 'statut',
    ];

    protected function casts(): array
    {
        return ['montant' => 'float'];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function coproprietaire(): BelongsTo
    {
        return $this->belongsTo(Coproprietaire::class);
    }
}
