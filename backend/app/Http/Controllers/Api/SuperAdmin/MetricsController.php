<?php

namespace App\Http\Controllers\Api\SuperAdmin;

use App\Http\Controllers\Controller;
use App\Models\Lead;
use App\Models\Lot;
use App\Models\NotificationLog;
use App\Models\Residence;
use App\Models\Tenant;
use App\Models\Ticket;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;

/**
 * Back-office — métriques globales Digitoyou (vue d'ensemble des clients).
 */
class MetricsController extends Controller
{
    /**
     * Tarif mensuel indicatif par plan (DH). Provisoire jusqu'à la gestion des
     * plans & tarifs (KAN-146) qui deviendra la source de vérité.
     */
    private const PLAN_PRICES = [
        'starter' => 199,
        'growth' => 399,
        'pro' => 699,
        'business' => 1200,
        'large' => 2500,
        'enterprise' => 5000,
    ];

    private const MOIS = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];

    public function __invoke(Request $request): JsonResponse
    {
        // Clients actifs (plan + date) réutilisés pour le MRR et son évolution.
        $actifs = Tenant::where('status', 'active')->get(['plan', 'created_at']);
        $price = fn (string $plan): int => self::PLAN_PRICES[$plan] ?? 0;
        $mrr = $actifs->sum(fn ($t) => $price($t->plan));

        $startMonth = Carbon::now()->startOfMonth();
        $mrrPrecedent = $actifs
            ->where('created_at', '<', $startMonth)
            ->sum(fn ($t) => $price($t->plan));

        // Conversion leads → clients (statut gagné ou converti en tenant).
        $totalLeads = Lead::count();
        $gagnes = Lead::where(fn ($q) => $q->where('statut', 'gagne')
            ->orWhereNotNull('converted_tenant_id'))->count();
        $conversion = $totalLeads > 0 ? round(($gagnes / $totalLeads) * 100, 1) : 0.0;

        // Churn (approx) : part des suspendus sur l'ensemble payant.
        $nbActifs = $actifs->count();
        $nbSuspendus = Tenant::where('status', 'suspended')->count();
        $churn = ($nbActifs + $nbSuspendus) > 0
            ? round(($nbSuspendus / ($nbActifs + $nbSuspendus)) * 100, 1)
            : 0.0;

        // Évolution 6 mois : MRR (approx sur le parc actif actuel) + nouveaux clients.
        $evolutionMrr = [];
        $nouveauxTenants = [];
        for ($i = 5; $i >= 0; $i--) {
            $start = (clone $startMonth)->subMonths($i);
            $end = (clone $start)->endOfMonth();
            $label = self::MOIS[$start->month - 1];

            $evolutionMrr[] = [
                'label' => $label,
                'value' => $actifs
                    ->where('created_at', '<=', $end)
                    ->sum(fn ($t) => $price($t->plan)),
            ];
            $nouveauxTenants[] = [
                'label' => $label,
                'value' => Tenant::whereBetween('created_at', [$start, $end])->count(),
            ];
        }

        return response()->json([
            'status' => 'success',
            'data' => [
                'clients' => [
                    'total' => Tenant::count(),
                    'actifs' => $nbActifs,
                    'essai' => Tenant::where('status', 'trial')->count(),
                    'suspendus' => $nbSuspendus,
                ],
                // KPIs business (KAN-139)
                'mrr' => $mrr,
                'arr' => $mrr * 12,
                'mrr_precedent' => $mrrPrecedent,
                'revenus_mois' => $mrr, // proxy jusqu'à la facturation réelle (KAN-140)
                'churn_pct' => $churn,
                'conversion_pct' => $conversion,
                'evolution_mrr' => $evolutionMrr,
                'nouveaux_tenants' => $nouveauxTenants,
                'par_plan' => Tenant::selectRaw('plan, COUNT(*) as nb')->groupBy('plan')->pluck('nb', 'plan'),
                'parc' => [
                    'residences' => Residence::withoutGlobalScope('tenant')->count(),
                    'lots' => Lot::withoutGlobalScope('tenant')->count(),
                    'utilisateurs' => User::count(),
                ],
                'essais_expirant_7j' => Tenant::where('status', 'trial')
                    ->whereNotNull('trial_ends_at')
                    ->whereBetween('trial_ends_at', [now(), now()->addDays(7)])
                    ->count(),
                // Usage plateforme — activité réelle des 30 derniers jours.
                'usage' => [
                    'utilisateurs_actifs_30j' => User::where('last_login_at', '>=', now()->subDays(30))->count(),
                    'tickets_ouverts' => Ticket::whereIn('statut', ['ouvert', 'en_cours'])->count(),
                    'notifications_30j' => NotificationLog::where('created_at', '>=', now()->subDays(30))->count(),
                    'nouveaux_clients_30j' => Tenant::where('created_at', '>=', now()->subDays(30))->count(),
                ],
                'derniers_clients' => Tenant::orderByDesc('created_at')->limit(5)->get()
                    ->map(fn (Tenant $t) => [
                        'id' => $t->id, 'name' => $t->name, 'plan' => $t->plan,
                        'status' => $t->status, 'created_at' => $t->created_at?->toIso8601String(),
                    ]),
            ],
        ]);
    }
}
