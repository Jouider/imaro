<?php

namespace App\Console\Commands;

use App\Models\Notification;
use App\Models\Ticket;
use App\Models\TicketSlaConfig;
use App\Models\User;
use Illuminate\Console\Command;

/**
 * Rappel automatique au manager (+ gestionnaire assigné) quand un ticket non
 * traité dépasse son délai SLA selon sa gravité (KAN-89). Délais configurables
 * par tenant (TicketSlaConfig). Tourne périodiquement (cf. routes/console.php).
 */
class SendTicketSlaRemindersCommand extends Command
{
    protected $signature = 'tickets:sla-reminders';

    protected $description = 'Notifie les managers des tickets dépassant leur délai SLA (par gravité).';

    /** Statuts considérés « non traités ». */
    private const STATUTS_OUVERTS = ['ouvert', 'en_cours'];

    public function handle(): int
    {
        // Tenants ayant des tickets ouverts non encore relancés (cross-tenant).
        $tenantIds = Ticket::withoutGlobalScope('tenant')
            ->whereIn('statut', self::STATUTS_OUVERTS)
            ->whereNull('sla_reminded_at')
            ->distinct()
            ->pluck('tenant_id');

        $total = 0;

        foreach ($tenantIds as $tenantId) {
            $config = TicketSlaConfig::forTenant($tenantId);
            if (! $config->enabled) {
                continue;
            }

            $managerIds = User::withoutGlobalScope('tenant')
                ->where('tenant_id', $tenantId)
                ->where('role', 'manager')
                ->pluck('id');

            foreach (['urgent', 'normal', 'faible'] as $priorite) {
                $seuil = now()->subHours($config->hoursForPriorite($priorite));

                $tickets = Ticket::withoutGlobalScope('tenant')
                    ->where('tenant_id', $tenantId)
                    ->where('priorite', $priorite)
                    ->whereIn('statut', self::STATUTS_OUVERTS)
                    ->whereNull('sla_reminded_at')
                    ->where('created_at', '<', $seuil)
                    ->get();

                foreach ($tickets as $ticket) {
                    $this->rappeler($ticket, $managerIds->all());
                    $total++;
                }
            }
        }

        $this->info("Rappels SLA envoyés : {$total}");

        return self::SUCCESS;
    }

    /** @param  list<int>  $managerIds */
    private function rappeler(Ticket $ticket, array $managerIds): void
    {
        // Destinataires = managers du tenant + gestionnaire assigné (dédupliqués).
        $destinataires = collect($managerIds)
            ->when($ticket->assigned_to, fn ($c) => $c->push($ticket->assigned_to))
            ->unique()
            ->filter()
            ->values();

        foreach ($destinataires as $userId) {
            Notification::create([
                'tenant_id' => $ticket->tenant_id,
                'user_id' => $userId,
                'type' => 'ticket', // enum notifications.type ; le dépassement SLA est marqué dans data.event
                'title' => 'Ticket en retard (SLA)',
                'message' => "Le ticket {$ticket->reference} ({$ticket->priorite}) dépasse son délai de traitement.",
                'read' => false,
                'data' => [
                    'event' => 'sla_breach',
                    'ticket_id' => $ticket->id,
                    'reference' => $ticket->reference,
                    'priorite' => $ticket->priorite,
                ],
            ]);
        }

        $ticket->forceFill(['sla_reminded_at' => now()])->saveQuietly();
    }
}
