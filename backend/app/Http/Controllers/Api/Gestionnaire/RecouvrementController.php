<?php

namespace App\Http\Controllers\Api\Gestionnaire;

use App\Http\Controllers\Api\Gestionnaire\Concerns\AuthorizesResidence;
use App\Http\Controllers\Controller;
use App\Models\Residence;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class RecouvrementController extends Controller
{
    use AuthorizesResidence;

    public function index(Request $request, Residence $residence): JsonResponse
    {
        $this->authorizeResidence($request, $residence);

        $exerciceId = null;
        if ($request->filled('exercice')) {
            $exerciceModel = $residence->exercices()->where('annee', $request->exercice)->first();
            $exerciceId = $exerciceModel?->id;
        } else {
            $exerciceId = $residence->exerciceActif?->id;
        }

        if (!$exerciceId) {
            return response()->json([
                'status' => 'success',
                'data' => [
                    'total_impaye' => 0,
                    'total_penalites' => 0,
                    'nb_lots_en_retard' => 0,
                    'prescription_risks' => [],
                    'lots' => [],
                ],
            ]);
        }

        // Get unpaid lines with coproprietaire info
        $impayesRaw = DB::table('appels_fonds_lignes as afl')
            ->join('appels_fonds as af', 'af.id', '=', 'afl.appel_fonds_id')
            ->join('coproprietaires as c', 'c.id', '=', 'afl.coproprietaire_id')
            ->join('users as u', 'u.id', '=', 'c.user_id')
            ->join('lots as l', 'l.id', '=', 'c.lot_id')
            ->where('af.residence_id', $residence->id)
            ->where('af.exercice_id', $exerciceId)
            ->where('af.statut', '!=', 'brouillon')
            ->whereColumn('afl.montant_paye', '<', 'afl.montant_du')
            ->select(
                'l.id as lot_id',
                'l.numero as lot_numero',
                'c.id as coproprietaire_id',
                'u.name as coproprietaire_nom',
                DB::raw('(afl.montant_du - afl.montant_paye) as montant_du'),
                'af.date_echeance',
                DB::raw('COALESCE((SELECT SUM(p.penalty_amount) FROM paiements p WHERE p.appel_fonds_ligne_id = afl.id), 0) as montant_penalites')
            )
            ->get();

        $totalImpaye = $impayesRaw->sum('montant_du');
        $totalPenalites = $impayesRaw->sum('montant_penalites');
        $lotsEnRetard = $impayesRaw->unique('lot_id')->count();

        // Group by lot
        $lotGroups = $impayesRaw->groupBy('lot_id');
        $lots = [];
        $prescriptionRisks = [];

        foreach ($lotGroups as $lotId => $lines) {
            $first = $lines->first();
            $totalDu = $lines->sum('montant_du');
            $totalPen = $lines->sum('montant_penalites');

            // Oldest date for prescription calculation
            $oldestDate = $lines->min('date_echeance');
            $ancienneteJours = (int) Carbon::parse($oldestDate)->diffInDays(now(), false);
            if ($ancienneteJours < 0) $ancienneteJours = 0;

            $lots[] = [
                'lot_id' => $first->lot_id,
                'lot_numero' => $first->lot_numero,
                'coproprietaire_nom' => $first->coproprietaire_nom,
                'montant_du' => round($totalDu, 2),
                'montant_penalites' => round($totalPen, 2),
                'anciennete_jours' => $ancienneteJours,
                'statut' => $this->getStatut($ancienneteJours),
            ];

            // Prescription risk per coproprietaire
            $joursRestants = (5 * 365) - $ancienneteJours; // 5 years prescription
            $prescriptionRisks[] = [
                'coproprietaire_id' => $first->coproprietaire_id,
                'lot_numero' => $first->lot_numero,
                'montant' => round($totalDu, 2),
                'date_origine' => $oldestDate,
                'jours_restants' => (int) max(0, $joursRestants),
                'severite' => $this->getSeverite($ancienneteJours),
            ];
        }

        // Sort prescription risks by severity (critical first)
        $severityOrder = ['critical' => 0, 'high' => 1, 'medium' => 2, 'low' => 3];
        usort($prescriptionRisks, fn ($a, $b) => ($severityOrder[$a['severite']] ?? 4) <=> ($severityOrder[$b['severite']] ?? 4));

        return response()->json([
            'status' => 'success',
            'data' => [
                'total_impaye' => round($totalImpaye, 2),
                'total_penalites' => round($totalPenalites, 2),
                'nb_lots_en_retard' => $lotsEnRetard,
                'prescription_risks' => $prescriptionRisks,
                'lots' => $lots,
            ],
        ]);
    }

    protected function getSeverite(int $ancienneteJours): string
    {
        $years = $ancienneteJours / 365;

        return match (true) {
            $years >= 4.5 => 'critical',
            $years >= 4.0 => 'high',
            $years >= 3.0 => 'medium',
            default => 'low',
        };
    }

    protected function getStatut(int $ancienneteJours): string
    {
        $years = $ancienneteJours / 365;

        return match (true) {
            $years >= 4.5 => 'prescription_imminente',
            $years >= 3.0 => 'contentieux',
            $ancienneteJours > 90 => 'relance_3',
            $ancienneteJours > 60 => 'relance_2',
            $ancienneteJours > 30 => 'relance_1',
            default => 'retard',
        };
    }
}
