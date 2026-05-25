<?php

namespace App\Models\Traits;

use App\Models\AuditLog;

trait LogsActivity
{
    public static function bootLogsActivity(): void
    {
        static::created(function ($model) {
            $model->logActivity('created');
        });

        static::updated(function ($model) {
            if ($model->isDirty()) {
                $model->logActivity('updated', $model->getChangesPayload());
            }
        });

        static::deleted(function ($model) {
            $severity = in_array(class_basename($model), ['Coproprietaire', 'Lot', 'Residence'])
                ? 'sensitive'
                : 'info';
            $model->logActivity('deleted', null, $severity);
        });
    }

    protected function logActivity(string $event, ?array $payload = null, string $severity = 'info'): void
    {
        $tenantId = $this->tenant_id ?? config('app.tenant_id');
        if (!$tenantId) {
            return;
        }

        $user = auth()->user();
        $category = $this->getAuditCategory();

        AuditLog::create([
            'tenant_id' => $tenantId,
            'user_id' => $user?->id,
            'user_email' => $user?->email,
            'category' => $category,
            'action' => class_basename($this) . '.' . $event,
            'severity' => $severity,
            'target_type' => get_class($this),
            'target_id' => $this->id,
            'target_label' => $this->getAuditLabel(),
            'payload' => $payload,
            'ip_address' => request()?->ip(),
            'user_agent' => request()?->userAgent(),
            'created_at' => now(),
        ]);
    }

    protected function getChangesPayload(): array
    {
        $changes = $this->getChanges();
        $original = collect($this->getOriginal())
            ->only(array_keys($changes))
            ->toArray();

        return [
            'before' => $original,
            'after' => $changes,
        ];
    }

    protected function getAuditCategory(): string
    {
        return match (class_basename($this)) {
            'Residence' => 'immeuble',
            'Lot' => 'lot',
            'Coproprietaire' => 'coproprietaire',
            'Paiement' => 'paiement',
            'Depense' => 'depense',
            'Budget', 'PosteBudgetaire', 'LigneBudget' => 'budget',
            'Assemblee', 'VoteAg' => 'ag',
            'Document' => 'document',
            'User' => 'user',
            default => 'system',
        };
    }

    protected function getAuditLabel(): ?string
    {
        return $this->name ?? $this->nom ?? $this->numero ?? $this->titre ?? null;
    }
}
