<?php

namespace App\Http\Controllers\Api\Gestionnaire;

use App\Http\Controllers\Controller;
use App\Models\Assemblee;
use App\Models\Coproprietaire;
use App\Models\Residence;
use App\Models\Ticket;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

class DashboardController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $userId   = $request->user()->id;
        $cacheKey = "gestionnaire:dashboard:{$userId}";

        $data = Cache::remember($cacheKey, 300, function () use ($userId, $request) {
            $residences = $request->user()->role === 'manager'
                ? Residence::where('tenant_id', $request->user()->tenant_id)->get()
                : Residence::where('gestionnaire_id', $userId)->get();
            $residenceIds = $residences->pluck('id');

            $nbCoproprietaires = Coproprietaire::whereHas(
                'lot', fn ($q) => $q->whereIn('residence_id', $residenceIds)
            )->count();

            $recouvrement = DB::table('appels_fonds_lignes')
                ->join('appels_fonds', 'appels_fonds.id', '=', 'appels_fonds_lignes.appel_fonds_id')
                ->whereIn('appels_fonds.residence_id', $residenceIds)
                ->where('appels_fonds.statut', '!=', 'brouillon')
                ->selectRaw('SUM(montant_du) as total_du, SUM(montant_paye) as total_paye')
                ->first();

            $totalDu   = (float) ($recouvrement->total_du ?? 0);
            $totalPaye = (float) ($recouvrement->total_paye ?? 0);

            // Top impayés
            $topImpayes = DB::table('appels_fonds_lignes as afl')
                ->join('coproprietaires as c', 'c.id', '=', 'afl.coproprietaire_id')
                ->join('users as u', 'u.id', '=', 'c.user_id')
                ->join('lots as l', 'l.id', '=', 'c.lot_id')
                ->join('appels_fonds as af', 'af.id', '=', 'afl.appel_fonds_id')
                ->whereIn('af.residence_id', $residenceIds)
                ->where('afl.statut', '!=', 'paye')
                ->selectRaw('c.id as copro_id, u.name as copro_name, l.numero as lot_numero,
                    SUM(afl.montant_du - afl.montant_paye) as montant,
                    DATEDIFF(NOW(), MIN(af.date_echeance)) as jours')
                ->groupBy('c.id', 'u.name', 'l.numero')
                ->orderByDesc('montant')
                ->limit(5)
                ->get()
                ->map(fn ($r) => [
                    'coproprietaire' => ['id' => $r->copro_id, 'name' => $r->copro_name],
                    'lot'            => $r->lot_numero,
                    'montant'        => round((float) $r->montant, 2),
                    'jours'          => max(0, (int) $r->jours),
                ]);

            // Tickets urgents ouverts (liste complète pour le dashboard)
            $ticketsUrgents = Ticket::whereIn('residence_id', $residenceIds)
                ->where('statut', 'ouvert')
                ->where('priorite', 'urgent')
                ->with('residence')
                ->orderByDesc('created_at')
                ->limit(5)
                ->get()
                ->map(fn ($t) => [
                    'id'         => $t->id,
                    'titre'      => $t->description,
                    'priorite'   => $t->priorite,
                    'statut'     => $t->statut,
                    'residence'  => ['id' => $t->residence?->id, 'name' => $t->residence?->name],
                    'created_at' => $t->created_at?->toIso8601String(),
                ]);

            // Assemblées à venir
            $assembleesAVenir = Assemblee::whereIn('residence_id', $residenceIds)
                ->where('statut', '!=', 'tenue')
                ->where('date', '>=', now())
                ->with('residence')
                ->orderBy('date')
                ->limit(5)
                ->get()
                ->map(fn ($a) => [
                    'id'        => $a->id,
                    'titre'     => $a->titre,
                    'date'      => $a->date?->toIso8601String(),
                    'residence' => ['name' => $a->residence?->name],
                ]);

            return [
                'kpi' => [
                    'nb_residences'      => $residences->count(),
                    'nb_coproprietaires' => $nbCoproprietaires,
                    'ca_mensuel'         => round($totalPaye, 2),
                    'total_impayes'      => round($totalDu - $totalPaye, 2),
                ],
                'top_impayes'        => $topImpayes,
                'tickets_urgents'    => $ticketsUrgents,
                'assemblees_a_venir' => $assembleesAVenir,
            ];
        });

        return response()->json(['status' => 'success', 'data' => $data]);
    }
}
