<?php

namespace App\Http\Controllers\Api\SuperAdmin;

use App\Http\Controllers\Controller;
use App\Models\AppelFonds;
use App\Models\Coproprietaire;
use App\Models\Exercice;
use App\Models\Lot;
use App\Models\NotificationLog;
use App\Models\Occupant;
use App\Models\Paiement;
use App\Models\PersonnelResidence;
use App\Models\Residence;
use App\Models\Tenant;
use App\Models\Ticket;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Carbon;

/**
 * Back-office Digitoyou — vue 360° d'un client (cabinet syndic).
 *
 * Agrège, hors scope tenant, l'ensemble de l'activité d'un cabinet :
 * usagers, gestionnaires, parc, réclamations (+SLA), finances, engagement
 * et consommation d'abonnement vs limites du plan (config/plans.php).
 *
 * Réservé au super_admin. Requêtes en lecture seule, pensées index-friendly
 * (tenant_id est indexé partout — cf. règles perf CLAUDE.md).
 */
class ClientOverviewController extends Controller
{
    /** GET /api/admin/tenants/{tenant}/overview */
    public function __invoke(Tenant $tenant): JsonResponse
    {
        return response()->json([
            'status' => 'success',
            'data' => ['overview' => [
                'tenant' => $this->tenantHeader($tenant),
                'usagers' => $this->usagers($tenant->id),
                'gestionnaires' => $this->gestionnaires($tenant->id),
                'parc' => $this->parc($tenant->id),
                'reclamations' => $this->reclamations($tenant->id),
                'finances' => $this->finances($tenant->id),
                'engagement' => $this->engagement($tenant->id),
                'abonnement' => $this->abonnement($tenant),
            ]],
        ]);
    }

    /** @return array<string, mixed> */
    private function tenantHeader(Tenant $t): array
    {
        return [
            'id' => $t->id,
            'name' => $t->name,
            'subdomain' => $t->subdomain,
            'plan' => $t->plan,
            'plan_label' => config("plans.catalog.{$t->plan}.label", ucfirst((string) $t->plan)),
            'status' => $t->status,
            'trial_ends_at' => $t->trial_ends_at?->toIso8601String(),
            'created_at' => $t->created_at?->toIso8601String(),
        ];
    }

    /** Usagers : total, actifs 30j, répartition par rôle. */
    private function usagers(int $tenantId): array
    {
        $parRole = User::where('tenant_id', $tenantId)
            ->selectRaw('role, COUNT(*) as n')
            ->groupBy('role')
            ->pluck('n', 'role');

        return [
            'total' => (int) $parRole->sum(),
            'actifs_30j' => User::where('tenant_id', $tenantId)
                ->where('last_login_at', '>=', now()->subDays(30))
                ->count(),
            'par_role' => [
                'manager' => (int) ($parRole['manager'] ?? 0),
                'gestionnaire' => (int) ($parRole['gestionnaire'] ?? 0),
                'conseil' => (int) ($parRole['conseil'] ?? 0),
                'resident' => (int) ($parRole['resident'] ?? 0),
                'agent_recouvrement' => (int) ($parRole['agent_recouvrement'] ?? 0),
            ],
        ];
    }

    /**
     * Gestionnaires (comptes rôle=gestionnaire) + personnel terrain
     * (gardiens, agents...) + charge (nb de résidences gérées par gestionnaire).
     */
    private function gestionnaires(int $tenantId): array
    {
        $charge = User::where('tenant_id', $tenantId)
            ->where('role', 'gestionnaire')
            ->get(['id', 'name', 'equipe_residence_ids'])
            ->map(fn (User $u) => [
                'name' => $u->name,
                'residences' => is_array($u->equipe_residence_ids) ? count($u->equipe_residence_ids) : 0,
            ])
            ->sortByDesc('residences')
            ->take(10)
            ->values();

        return [
            'total' => User::where('tenant_id', $tenantId)->where('role', 'gestionnaire')->count(),
            'personnel_terrain' => PersonnelResidence::where('tenant_id', $tenantId)->where('is_active', true)->count(),
            'charge' => $charge,
        ];
    }

    /** Parc immobilier géré par le cabinet. */
    private function parc(int $tenantId): array
    {
        return [
            'residences' => Residence::withoutGlobalScope('tenant')->where('tenant_id', $tenantId)->count(),
            'lots' => Lot::where('tenant_id', $tenantId)->count(),
            'coproprietaires' => Coproprietaire::where('tenant_id', $tenantId)->count(),
            'occupants' => Occupant::withoutGlobalScope('tenant')->where('tenant_id', $tenantId)->count(),
            'exercices_actifs' => Exercice::withoutGlobalScope('tenant')
                ->where('tenant_id', $tenantId)->where('statut', 'actif')->count(),
        ];
    }

    /** Réclamations (tickets) : volume, statuts, SLA, satisfaction. */
    private function reclamations(int $tenantId): array
    {
        $base = Ticket::where('tenant_id', $tenantId);

        $parStatut = (clone $base)->selectRaw('statut, COUNT(*) as n')->groupBy('statut')->pluck('n', 'statut');

        // Délai de résolution moyen (heures) sur les tickets clos/résolus.
        // GREATEST(...,0) protège d'une éventuelle incohérence de dates (jamais négatif).
        $delaiMoyenH = (clone $base)->whereNotNull('closed_at')
            ->selectRaw('AVG(GREATEST(TIMESTAMPDIFF(HOUR, created_at, closed_at), 0)) as h')
            ->value('h');

        return [
            'total' => (int) $parStatut->sum(),
            'par_statut' => [
                'ouvert' => (int) ($parStatut['ouvert'] ?? 0),
                'en_cours' => (int) ($parStatut['en_cours'] ?? 0),
                'resolu' => (int) ($parStatut['resolu'] ?? 0),
                'clos' => (int) ($parStatut['clos'] ?? 0),
            ],
            'urgents_ouverts' => (clone $base)->where('priorite', 'urgent')
                ->whereIn('statut', ['ouvert', 'en_cours'])->count(),
            'delai_resolution_moyen_h' => $delaiMoyenH !== null ? round((float) $delaiMoyenH, 1) : null,
            'satisfaction_moyenne' => (clone $base)->whereNotNull('note_satisfaction')->avg('note_satisfaction'),
        ];
    }

    /** Finances : appels de fonds vs encaissements sur l'exercice actif le plus récent. */
    private function finances(int $tenantId): array
    {
        $exercice = Exercice::withoutGlobalScope('tenant')
            ->where('tenant_id', $tenantId)
            ->where('statut', 'actif')
            ->orderByDesc('annee')
            ->first();

        $appels = AppelFonds::withoutGlobalScope('tenant')->where('tenant_id', $tenantId);
        $paiements = Paiement::where('tenant_id', $tenantId)->where('statut', 'paye');

        if ($exercice) {
            $appels->where('exercice_id', $exercice->id);
            $paiements->where('exercice_id', $exercice->id);
        }

        $totalAppels = (float) $appels->sum('montant_total');
        $encaisse = (float) $paiements->sum('montant');

        return [
            'exercice_actif' => $exercice?->annee,
            'appels_total_mad' => round($totalAppels, 2),
            'encaisse_mad' => round($encaisse, 2),
            'impayes_mad' => round(max($totalAppels - $encaisse, 0), 2),
            'taux_recouvrement' => $totalAppels > 0 ? round($encaisse / $totalAppels * 100, 1) : null,
        ];
    }

    /** Engagement : dernière activité et volume de notifications (30j). */
    private function engagement(int $tenantId): array
    {
        $derniereActivite = User::where('tenant_id', $tenantId)->max('last_login_at');

        $notifs = NotificationLog::where('tenant_id', $tenantId)
            ->where('created_at', '>=', now()->subDays(30))
            ->selectRaw('canal, COUNT(*) as n')
            ->groupBy('canal')
            ->pluck('n', 'canal');

        $echecs = NotificationLog::where('tenant_id', $tenantId)
            ->where('created_at', '>=', now()->subDays(30))
            ->where('statut', 'echec')
            ->count();

        return [
            'derniere_activite' => $derniereActivite ? Carbon::parse($derniereActivite)->toIso8601String() : null,
            'logins_7j' => User::where('tenant_id', $tenantId)
                ->where('last_login_at', '>=', now()->subDays(7))->count(),
            'notifications_30j' => [
                'whatsapp' => (int) ($notifs['whatsapp'] ?? 0),
                'sms' => (int) ($notifs['sms'] ?? 0),
                'email' => (int) ($notifs['email'] ?? 0),
                'echecs' => $echecs,
            ],
        ];
    }

    /** Abonnement : consommation vs limites du plan (jauges + alertes dépassement). */
    private function abonnement(Tenant $t): array
    {
        $limits = config("plans.catalog.{$t->plan}.limits", []);
        $warnAt = (int) config('plans.warn_threshold', 80);

        $used = [
            'residences' => Residence::withoutGlobalScope('tenant')->where('tenant_id', $t->id)->count(),
            'lots' => Lot::where('tenant_id', $t->id)->count(),
            'users' => User::where('tenant_id', $t->id)->count(),
        ];

        $quotas = [];
        foreach (['residences' => 'Résidences', 'lots' => 'Lots', 'users' => 'Utilisateurs'] as $key => $label) {
            $limit = $limits[$key] ?? null;
            $u = $used[$key];
            $pct = ($limit && $limit > 0) ? round($u / $limit * 100, 1) : null;
            $quotas[] = [
                'ressource' => $label,
                'used' => $u,
                'limit' => $limit, // null = illimité
                'pct' => $pct,
                'warn' => $pct !== null && $pct >= $warnAt,
                'over' => $limit !== null && $u > $limit,
            ];
        }

        return [
            'plan' => $t->plan,
            'plan_label' => config("plans.catalog.{$t->plan}.label", ucfirst((string) $t->plan)),
            'status' => $t->status,
            'trial_ends_at' => $t->trial_ends_at?->toIso8601String(),
            'storage_limit_mb' => $limits['storage_mb'] ?? null,
            'quotas' => $quotas,
        ];
    }
}
