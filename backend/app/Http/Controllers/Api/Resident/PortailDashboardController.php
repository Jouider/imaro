<?php

namespace App\Http\Controllers\Api\Resident;

use App\Http\Controllers\Controller;
use App\Models\AppelFondsLigne;
use App\Models\Lot;
use App\Models\Residence;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * GET /api/portail/dashboard
 * Contrat front (DashboardData) :
 *   { resident:{name,lot,residence}, balance, statut:'a_jour'|'en_retard',
 *     prochain_appel:{montant,date}|null }
 * balance < 0 = le copropriétaire doit de l'argent.
 */
class PortailDashboardController extends Controller
{
    public function __invoke(Request $request): JsonResponse
    {
        $user = $request->user();
        $copro = $user->coproprietaire;

        // withoutGlobalScope : lot/résidence doivent se résoudre même si le
        // contexte tenant de la requête (config app.tenant_id) n'est pas posé.
        $lot = $copro?->lot_id ? Lot::withoutGlobalScope('tenant')->find($copro->lot_id) : null;
        $residence = $lot ? Residence::withoutGlobalScope('tenant')->find($lot->residence_id) : null;

        $resident = [
            'name' => $user->name,
            'lot' => $lot?->numero ?? '—',
            'residence' => $residence?->name ?? '—',
        ];

        if (! $copro) {
            return response()->json(['status' => 'success', 'data' => [
                'resident' => $resident, 'balance' => 0, 'statut' => 'a_jour', 'prochain_appel' => null,
            ]]);
        }

        // Pas de whereHas('appelFonds') (déclencherait le scope tenant d'AppelFonds,
        // pas toujours posé pour un résident) — on charge sans scope et filtre en PHP.
        $lignes = AppelFondsLigne::where('coproprietaire_id', $copro->id)
            ->with(['appelFonds' => fn ($q) => $q->withoutGlobalScope('tenant')])
            ->get()
            ->filter(fn ($l) => $l->appelFonds && $l->appelFonds->statut !== 'brouillon')
            ->values();

        $du = (float) $lignes->sum('montant_du');
        $paye = (float) $lignes->sum('montant_paye');
        $balance = round($paye - $du, 2);   // négatif = solde dû

        $prochain = $lignes->filter(fn ($l) => $l->statut !== 'paye')
            ->sortBy(fn ($l) => $l->appelFonds?->date_echeance)->first();

        return response()->json(['status' => 'success', 'data' => [
            'resident' => $resident,
            'balance' => $balance,
            'statut' => $balance < 0 ? 'en_retard' : 'a_jour',
            'prochain_appel' => $prochain ? [
                'montant' => round((float) $prochain->montant_du, 2),
                'date' => $prochain->appelFonds?->date_echeance?->toDateString(),
            ] : null,
        ]]);
    }
}
