<?php

namespace App\Http\Controllers\Api\Resident;

use App\Http\Controllers\Controller;
use App\Models\AppelFondsLigne;
use App\Models\Paiement;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class PortailOperationsController extends Controller
{
    public function __invoke(Request $request): JsonResponse
    {
        $user  = $request->user();
        $copro = $user->coproprietaires()->first();

        if (! $copro) {
            return response()->json(['status' => 'success', 'data' => ['operations' => []]]);
        }

        // Paiements effectués
        $paiements = Paiement::where('coproprietaire_id', $copro->id)
            ->orderByDesc('date_paiement')
            ->get()
            ->map(fn ($p) => [
                'id'       => $p->id,
                'type'     => 'paiement',
                'libelle'  => 'Paiement charges',
                'montant'  => $p->montant,
                'date'     => $p->date_paiement?->toIso8601String(),
                'statut'   => 'valide',
                'recu_url' => $p->recu_pdf_path ? Storage::disk('public')->url($p->recu_pdf_path) : null,
            ]);

        // Appels de fonds reçus
        $appels = AppelFondsLigne::where('coproprietaire_id', $copro->id)
            ->with('appelFonds')
            ->orderByDesc('created_at')
            ->get()
            ->map(fn ($l) => [
                'id'       => 'af-' . $l->id,
                'type'     => 'appel_fonds',
                'libelle'  => $l->appelFonds?->libelle ?? 'Appel de fonds',
                'montant'  => -$l->montant_du,
                'date'     => $l->created_at?->toIso8601String(),
                'statut'   => $l->statut,
                'recu_url' => null,
            ]);

        $operations = $paiements->concat($appels)
            ->sortByDesc('date')
            ->values();

        return response()->json([
            'status' => 'success',
            'data'   => ['operations' => $operations],
        ]);
    }
}
