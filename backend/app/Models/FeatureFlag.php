<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * KAN-142 — feature flag : une fonctionnalité activable par plan, sans redéploiement.
 */
class FeatureFlag extends Model
{
    protected $fillable = ['key', 'label', 'description', 'enabled_plans'];

    protected function casts(): array
    {
        return ['enabled_plans' => 'array'];
    }

    /** Résolution du binding de route par `key` (et non par id). */
    public function getRouteKeyName(): string
    {
        return 'key';
    }

    /**
     * Fonctionnalités actives pour un plan donné.
     *
     * NB : `config('features.ia')` reste un kill-switch GLOBAL (coût, KAN-111) —
     * si l'IA est coupée globalement, aucun plan ne l'obtient.
     *
     * @return array<int, string>
     */
    public static function enabledKeysForPlan(?string $plan): array
    {
        if (! $plan) {
            return [];
        }

        return static::query()->get()
            ->filter(function (self $flag) use ($plan) {
                if ($flag->key === 'ai' && ! config('features.ia')) {
                    return false;
                }

                return in_array($plan, $flag->enabled_plans ?? [], true);
            })
            ->pluck('key')
            ->values()
            ->all();
    }
}
