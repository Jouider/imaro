<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Config SLA des tickets par tenant (KAN-89) : délai max de traitement (en
 * heures) avant rappel automatique au manager, par niveau de gravité.
 */
class TicketSlaConfig extends Model
{
    /** Valeurs par défaut (urgent 24h, normal 72h, faible 7j). */
    public const DEFAULTS = [
        'enabled' => true,
        'urgent_hours' => 24,
        'normal_hours' => 72,
        'faible_hours' => 168,
    ];

    protected $fillable = [
        'tenant_id', 'enabled', 'urgent_hours', 'normal_hours', 'faible_hours',
    ];

    protected function casts(): array
    {
        return [
            'enabled' => 'boolean',
            'urgent_hours' => 'integer',
            'normal_hours' => 'integer',
            'faible_hours' => 'integer',
        ];
    }

    /** Config du tenant, ou une instance par défaut (non persistée) si absente. */
    public static function forTenant(int $tenantId): self
    {
        return static::firstWhere('tenant_id', $tenantId)
            ?? (new self(self::DEFAULTS + ['tenant_id' => $tenantId]));
    }

    /** Délai SLA (heures) pour une gravité de ticket (urgent|normal|faible). */
    public function hoursForPriorite(string $priorite): int
    {
        return match ($priorite) {
            'urgent' => $this->urgent_hours,
            'faible' => $this->faible_hours,
            default => $this->normal_hours,
        };
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }
}
