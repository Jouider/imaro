<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Étape d'un scénario de relance (KAN-87) : J+X après échéance, canal, type.
 */
class RelanceScenarioStep extends Model
{
    protected $fillable = ['relance_scenario_id', 'ordre', 'delai_jours', 'canal', 'type'];

    protected function casts(): array
    {
        return [
            'ordre' => 'integer',
            'delai_jours' => 'integer',
        ];
    }

    public function scenario(): BelongsTo
    {
        return $this->belongsTo(RelanceScenario::class, 'relance_scenario_id');
    }
}
