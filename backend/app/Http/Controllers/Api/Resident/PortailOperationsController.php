<?php

namespace App\Http\Controllers\Api\Resident;

use App\Http\Controllers\Controller;
use App\Models\AppelFondsLigne;
use App\Models\Paiement;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PortailOperationsController extends Controller
{
    public function __invoke(Request $request): JsonResponse
    {
        $copro = $request->user()->coproprietaire;
        if (! $copro) {
            return response()->json(['status' => 'success', 'data' => ['appels' => [], 'paiements' => []]]);
        }

        // NB: pas de whereHas('appelFonds') — ça déclencherait le scope tenant
        // d'AppelFonds (config app.tenant_id, pas toujours posé pour un résident)
        // et renverrait 0. On charge la relation sans scope et on filtre en PHP.
        $appels = AppelFondsLigne::where('coproprietaire_id', $copro->id)
            ->with(['appelFonds' => fn ($q) => $q->withoutGlobalScope('tenant')])
            ->get()
            ->filter(fn ($l) => $l->appelFonds && $l->appelFonds->statut !== 'brouillon')
            ->map(fn ($l) => [
                'id' => $l->id, 'titre' => $l->appelFonds?->libelle ?? '',
                'montant_du' => round((float) $l->montant_du, 2),
                'montant_paye' => round((float) $l->montant_paye, 2),
                'date_echeance' => $l->appelFonds?->date_echeance?->toDateString(),
                'statut' => $l->statut,
            ])->values();

        $paiements = Paiement::where('coproprietaire_id', $copro->id)
            ->orderByDesc('date_paiement')->get()->map(fn ($p) => [
                'id' => $p->id, 'montant' => round((float) $p->montant, 2),
                'date_paiement' => $p->date_paiement?->toDateString(),
                'mode' => $p->mode, 'reference' => $p->reference,
            ]);

        return response()->json([
            'status' => 'success',
            'data'   => ['appels' => $appels, 'paiements' => $paiements],
        ]);
    }
}
