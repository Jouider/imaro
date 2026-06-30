<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * Scénario de relance de recouvrement d'une résidence (KAN-87).
 */
class RelanceScenario extends Model
{
    protected $fillable = ['tenant_id', 'residence_id', 'enabled'];

    protected function casts(): array
    {
        return ['enabled' => 'boolean'];
    }

    public function steps(): HasMany
    {
        return $this->hasMany(RelanceScenarioStep::class)->orderBy('ordre');
    }

    public function residence(): BelongsTo
    {
        return $this->belongsTo(Residence::class);
    }
}
