<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Lead / démo du pipeline commercial Digitoyou (back-office). Global — pas de
 * scope tenant. Converti en client (Tenant) via converted_tenant_id.
 */
class Lead extends Model
{
    public const SOURCES = ['site', 'salon', 'recommandation', 'appel', 'autre'];

    public const STATUTS = ['nouveau', 'contacte', 'demo_planifiee', 'gagne', 'perdu'];

    protected $fillable = [
        'cabinet_nom', 'contact_nom', 'contact_email', 'contact_telephone',
        'ville', 'source', 'statut', 'date_demo', 'notes', 'converted_tenant_id',
    ];

    protected function casts(): array
    {
        return ['date_demo' => 'date'];
    }

    public function convertedTenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class, 'converted_tenant_id');
    }
}
