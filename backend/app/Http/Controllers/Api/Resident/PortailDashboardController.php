<?php

namespace App\Http\Controllers\Api\Resident;

use App\Http\Controllers\Controller;
use App\Models\AppelFonds;
use App\Models\AppelFondsLigne;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PortailDashboardController extends Controller
{
    public function __invoke(Request $request): JsonResponse
    {
        $user = $request->user();

        // Trouver le coproprietaire lié à ce user
        $copro = $user->coproprietaires()->with('lot.residence')->first();

        if (! $copro) {
            return response()->json([
                'status' => 'success',
                'data'   => [
                    'balance'        => 0,
                    'statut'         => 'a_jour',
                    'prochain_appel' => null,
                ],
            ]);
        }

        $balance = $copro->solde_actuel ?? 0;
        $statut  = $balance < 0 ? 'en_retard' : 'a_jour';

        // Prochain appel de fonds non payé
        $prochaineLigne = AppelFondsLigne::where('coproprietaire_id', $copro->id)
            ->where('statut', '!=', 'paye')
            ->whereHas('appelFonds', fn ($q) => $q->where('statut', 'envoye'))
            ->with('appelFonds')
            ->orderBy('created_at')
            ->first();

        $prochainAppel = null;
        if ($prochaineLigne) {
            $prochainAppel = [
                'montant' => $prochaineLigne->montant_du - $prochaineLigne->montant_paye,
                'date'    => $prochaineLigne->appelFonds->date_echeance?->toDateString(),
            ];
        }

        return response()->json([
            'status' => 'success',
            'data'   => [
                'balance'        => $balance,
                'statut'         => $statut,
                'prochain_appel' => $prochainAppel,
            ],
        ]);
    }
}
