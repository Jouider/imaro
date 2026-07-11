<?php

namespace App\Http\Controllers\Api\Gestionnaire;

use App\Http\Controllers\Api\Gestionnaire\Concerns\AuthorizesResidence;
use App\Http\Controllers\Controller;
use App\Models\PenaltyConfig;
use App\Models\Paiement;
use App\Models\Residence;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class PenaltyController extends Controller
{
    use AuthorizesResidence;

    public function show(Request $request, Residence $residence): JsonResponse
    {
        $this->authorizeResidence($request, $residence);

        $config = PenaltyConfig::firstOrCreate(
            ['residence_id' => $residence->id],
            [
                'enabled' => false,
                'grace_period_days' => 15,
                'rate_type' => 'percentage',
                'rate_value' => 5.0000,
            ]
        );

        return response()->json([
            'status' => 'success',
            'data' => $config,
        ]);
    }

    public function update(Request $request, Residence $residence): JsonResponse
    {
        $this->authorizeResidence($request, $residence);

        $validated = $request->validate([
            'enabled' => ['required', 'boolean'],
            'grace_period_days' => ['required', 'integer', 'min:0', 'max:90'],
            'rate_type' => ['required', 'in:fixed,percentage,daily'],
            'rate_value' => ['required', 'numeric', 'min:0', 'max:100'],
            'cap_max_montant' => ['nullable', 'numeric', 'min:0'],
            'ag_approved_at' => ['nullable', 'date'],
            'ag_id' => ['nullable', 'integer'],
        ]);

        $config = PenaltyConfig::updateOrCreate(
            ['residence_id' => $residence->id],
            $validated
        );

        return response()->json([
            'status' => 'success',
            'message' => 'Configuration pénalités mise à jour',
            'data' => $config,
        ]);
    }

    public function recalculate(Request $request, Residence $residence): JsonResponse
    {
        $this->authorizeResidence($request, $residence);

        $config = PenaltyConfig::where('residence_id', $residence->id)->first();

        if (!$config || !$config->enabled) {
            return response()->json([
                'status' => 'success',
                'data' => ['recalculated' => 0, 'total_penalty_amount' => 0],
            ]);
        }

        $exerciceActif = $residence->exerciceActif;
        if (!$exerciceActif) {
            return response()->json([
                'status' => 'error',
                'message' => 'Aucun exercice actif',
            ], 422);
        }

        // Get all unpaid appel_fonds_lignes for this residence
        $impayesLignes = DB::table('appels_fonds_lignes')
            ->join('appels_fonds', 'appels_fonds.id', '=', 'appels_fonds_lignes.appel_fonds_id')
            ->where('appels_fonds.residence_id', $residence->id)
            ->where('appels_fonds.exercice_id', $exerciceActif->id)
            ->where('appels_fonds.statut', 'envoye')
            ->whereColumn('appels_fonds_lignes.montant_paye', '<', 'appels_fonds_lignes.montant_du')
            ->select(
                'appels_fonds_lignes.id',
                'appels_fonds_lignes.coproprietaire_id',
                'appels_fonds_lignes.montant_du',
                'appels_fonds_lignes.montant_paye',
                'appels_fonds.date_echeance'
            )
            ->get();

        $recalculated = 0;
        $totalPenalty = 0;

        foreach ($impayesLignes as $ligne) {
            $dueDate = Carbon::parse($ligne->date_echeance);
            $daysOverdue = now()->diffInDays($dueDate);

            if ($daysOverdue <= $config->grace_period_days) {
                continue;
            }

            $impaye = $ligne->montant_du - $ligne->montant_paye;
            $penalty = $this->calculatePenalty($config, $impaye, $daysOverdue - $config->grace_period_days);

            // Update paiement penalty if exists
            $paiement = Paiement::where('appel_fonds_ligne_id', $ligne->id)->first();
            if ($paiement) {
                $paiement->update([
                    'penalty_amount' => $penalty,
                    'penalty_calculated_at' => now(),
                ]);
                $recalculated++;
                $totalPenalty += $penalty;
            }
        }

        return response()->json([
            'status' => 'success',
            'data' => [
                'recalculated' => $recalculated,
                'total_penalty_amount' => round($totalPenalty, 2),
            ],
        ]);
    }

    public function miseEnDemeure(Request $request, Paiement $paiement): JsonResponse
    {
        $paiement->update([
            'mise_en_demeure_sent_at' => now(),
        ]);

        return response()->json([
            'status' => 'success',
            'message' => 'Mise en demeure envoyée',
            'data' => [
                'paiement' => $paiement->fresh(),
                'pdf_url' => null, // TODO: generate PDF
            ],
        ]);
    }

    protected function calculatePenalty(PenaltyConfig $config, float $montantImpaye, int $daysOverGrace): float
    {
        $penalty = match ($config->rate_type) {
            'fixed' => $config->rate_value,
            'percentage' => $montantImpaye * ($config->rate_value / 100),
            'daily' => $config->rate_value * $daysOverGrace,
        };

        if ($config->cap_max_montant && $penalty > $config->cap_max_montant) {
            $penalty = $config->cap_max_montant;
        }

        return round($penalty, 2);
    }
}
