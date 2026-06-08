<?php

namespace App\Console\Commands;

use App\Models\Coproprietaire;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

/**
 * Soft-deletes every coproprietaire link of a tenant (a cabinet syndic) and,
 * ONLY when a resident user becomes orphaned (no remaining lot anywhere),
 * soft-deletes their account too.
 *
 * Why orphan-aware: a copropriétaire user can hold several lots across several
 * résidences (each possibly run by a different gestionnaire) and, in theory,
 * across tenants. Deleting one scope must never remove a user still attached
 * elsewhere. Financial history (paiements, appels de fonds, tickets) is kept —
 * soft-delete leaves the rows + FKs intact.
 *
 *   php artisan imaro:purge-coproprietaires --tenant=1 --dry-run
 *   php artisan imaro:purge-coproprietaires --manager=fikri@blancasyndic.ma
 */
class PurgeCoproprietaires extends Command
{
    protected $signature = 'imaro:purge-coproprietaires
                            {--tenant= : Tenant ID (cabinet syndic) to purge}
                            {--manager= : OR a manager email — resolves their tenant}
                            {--dry-run : Show what would happen, change nothing}
                            {--force : Skip the confirmation prompt}';

    protected $description = 'Soft-delete all coproprietaires of a tenant (orphan-aware on user accounts)';

    public function handle(): int
    {
        $tenantId = $this->resolveTenantId();
        if (! $tenantId) {
            return self::FAILURE;
        }

        $dryRun = (bool) $this->option('dry-run');

        // Coproprietaire links in scope (non-trashed).
        $copros = Coproprietaire::where('tenant_id', $tenantId)->get(['id', 'user_id']);

        if ($copros->isEmpty()) {
            $this->info("Aucun copropriétaire à supprimer pour le tenant {$tenantId}.");

            return self::SUCCESS;
        }

        $userIds = $copros->pluck('user_id')->unique()->values();

        // A resident becomes orphan only if they have NO coproprietaire row left
        // outside this tenant (after the scope is removed).
        $orphans = [];
        $kept = [];
        foreach ($userIds as $uid) {
            $elsewhere = Coproprietaire::where('user_id', $uid)
                ->where('tenant_id', '!=', $tenantId)
                ->exists();

            $user = User::find($uid);
            if ($user && $user->role === 'resident' && ! $elsewhere) {
                $orphans[] = $uid;
            } else {
                $kept[] = $uid;
            }
        }

        $tenantName = optional(Tenant::find($tenantId))->name ?? '?';
        $this->newLine();
        $this->line("Tenant : <info>{$tenantId}</info> ({$tenantName})");
        $this->table(
            ['Action', 'Nombre'],
            [
                ['Liens copropriétaire à soft-delete', $copros->count()],
                ['Comptes resident à soft-delete (orphelins)', count($orphans)],
                ['Comptes conservés (lots ailleurs / non-resident)', count($kept)],
            ]
        );

        if ($dryRun) {
            $this->warn('DRY-RUN : aucune modification effectuée.');

            return self::SUCCESS;
        }

        if (! $this->option('force')
            && ! $this->confirm("Confirmer la suppression (soft) de {$copros->count()} copropriétaires du tenant {$tenantId} ?")) {
            $this->info('Annulé.');

            return self::SUCCESS;
        }

        DB::transaction(function () use ($tenantId, $orphans) {
            Coproprietaire::where('tenant_id', $tenantId)->delete();

            if ($orphans !== []) {
                User::whereIn('id', $orphans)
                    ->where('role', 'resident')
                    ->delete();
            }
        });

        $this->info('✅ '.$copros->count().' copropriétaires soft-deleted, '.count($orphans).' comptes resident orphelins soft-deleted.');
        $this->line('Historique financier (paiements, appels de fonds, tickets) conservé.');

        return self::SUCCESS;
    }

    private function resolveTenantId(): ?int
    {
        if ($tenant = $this->option('tenant')) {
            return (int) $tenant;
        }

        if ($email = $this->option('manager')) {
            $manager = User::where('email', $email)->whereIn('role', ['manager', 'super_admin'])->first();
            if (! $manager) {
                $this->error("Aucun manager trouvé pour l'email {$email}.");

                return null;
            }

            return (int) $manager->tenant_id;
        }

        $this->error('Précise --tenant=ID ou --manager=email.');

        return null;
    }
}
