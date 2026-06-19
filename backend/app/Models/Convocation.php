<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Convocation extends Model
{
    protected $fillable = [
        'tenant_id', 'assemblee_id', 'coproprietaire_id',
        'coproprietaire_nom', 'lot_numero', 'tantieme', 'pdf_path',
    ];

    public function assemblee(): BelongsTo
    {
        return $this->belongsTo(Assemblee::class);
    }
}
