<?php

namespace App\Http\Controllers\Api\Gestionnaire;

use App\Http\Controllers\Controller;
use App\Models\AppelFonds;
use App\Models\Residence;
use App\Models\Ticket;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;

class DashboardController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $userId = $request->user()->id;
        $cacheKey = "gestionnaire:dashboard:{$userId}";

        $data = Cache::remember($cacheKey, 300, function () use ($userId) {
            $residences = Residence::where('gestionnaire_id', $userId)
                ->withCount('lots')
                ->get();

            $residenceIds = $residences->pluck('id');

            $lotsCount = $residences->sum('lots_count');

            // Recouvrement across all active appels de fonds
            $recouvrement = \DB::table('appels_fonds_lignes')
                ->join('appels_fonds', 'appels_fonds.id', '=', 'appels_fonds_lignes.appel_fonds_id')
                ->whereIn('appels_fonds.residence_id', $residenceIds)
                ->where('appels_fonds.statut', '!=', 'brouillon')
                ->selectRaw('SUM(montant_du) as total_du, SUM(montant_paye) as total_paye')
                ->first();

            $totalDu = (float) ($recouvrement->total_du ?? 0);
            $totalPaye = (float) ($recouvrement->total_paye ?? 0);
            $tauxRecouvrement = $totalDu > 0 ? round(($totalPaye / $totalDu) * 100, 1) : 0;

            // Tickets
            $ticketsOuverts = Ticket::whereIn('residence_id', $residenceIds)
                ->where('statut', 'ouvert')
                ->count();

            $ticketsUrgents = Ticket::whereIn('residence_id', $residenceIds)
                ->where('statut', 'ouvert')
                ->where('priorite', 'urgent')
                ->count();

            $appelsFondsActifs = AppelFonds::whereIn('residence_id', $residenceIds)
                ->where('statut', 'envoye')
                ->count();

            return [
                'residences_count' => $residences->count(),
                'lots_count' => $lotsCount,
                'taux_recouvrement' => $tauxRecouvrement,
                'montant_recouvre' => $totalPaye,
                'montant_restant' => round($totalDu - $totalPaye, 2),
                'tickets_ouverts' => $ticketsOuverts,
                'tickets_urgents' => $ticketsUrgents,
                'appels_fonds_actifs' => $appelsFondsActifs,
            ];
        });

        return response()->json([
            'status' => 'success',
            'data' => $data,
        ]);
    }
}
