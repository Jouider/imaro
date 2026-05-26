<?php

namespace App\Http\Controllers\Api\Gestionnaire;

use App\Http\Controllers\Controller;
use App\Models\Remboursement;
use App\Models\Residence;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class RemboursementController extends Controller
{
    public function index(Request $request, Residence $residence): JsonResponse
    {
        $remboursements = Remboursement::where('residence_id', $residence->id)
            ->orderByDesc('date_demande')
            ->get()
            ->map(fn (Remboursement $r) => $this->format($r));

        return response()->json([
            'status' => 'success',
            'data'   => ['remboursements' => $remboursements],
        ]);
    }

    public function store(Request $request, Residence $residence): JsonResponse
    {
        $data = $request->validate([
            'coproprietaire_id'  => 'required|integer|exists:coproprietaires,id',
            'coproprietaire_nom' => 'required|string|max:255',
            'lot_numero'         => 'nullable|string|max:50',
            'motif'              => 'required|in:trop_percu,erreur_appel,indemnite,autre',
            'description'        => 'nullable|string',
            'montant'            => 'required|numeric|min:0.01',
            'date_demande'       => 'required|date',
            'date_paiement'      => 'nullable|date',
            'mode_paiement'      => 'nullable|in:virement,cheque,especes',
            'reference'          => 'nullable|string|max:100',
            'statut'             => 'sometimes|in:demande,approuve,paye,rejete',
        ]);

        $data['tenant_id']    = $request->user()->tenant_id;
        $data['residence_id'] = $residence->id;
        $data['statut']       = $data['statut'] ?? 'demande';

        $remboursement = Remboursement::create($data);

        return response()->json([
            'status'  => 'success',
            'message' => 'Remboursement créé.',
            'data'    => ['remboursement' => $this->format($remboursement)],
        ], 201);
    }

    public function update(Request $request, Remboursement $remboursement): JsonResponse
    {
        $data = $request->validate([
            'coproprietaire_id'  => 'sometimes|integer|exists:coproprietaires,id',
            'coproprietaire_nom' => 'sometimes|string|max:255',
            'lot_numero'         => 'nullable|string|max:50',
            'motif'              => 'sometimes|in:trop_percu,erreur_appel,indemnite,autre',
            'description'        => 'nullable|string',
            'montant'            => 'sometimes|numeric|min:0.01',
            'date_demande'       => 'sometimes|date',
            'date_paiement'      => 'nullable|date',
            'mode_paiement'      => 'nullable|in:virement,cheque,especes',
            'reference'          => 'nullable|string|max:100',
            'statut'             => 'sometimes|in:demande,approuve,paye,rejete',
        ]);

        $remboursement->update($data);

        return response()->json([
            'status'  => 'success',
            'message' => 'Remboursement mis à jour.',
            'data'    => ['remboursement' => $this->format($remboursement)],
        ]);
    }

    public function destroy(Remboursement $remboursement): JsonResponse
    {
        $remboursement->delete();

        return response()->json(['status' => 'success', 'message' => 'Remboursement supprimé.']);
    }

    private function format(Remboursement $r): array
    {
        return [
            'id'                 => $r->id,
            'residence_id'       => $r->residence_id,
            'coproprietaire_id'  => $r->coproprietaire_id,
            'coproprietaire_nom' => $r->coproprietaire_nom,
            'lot_numero'         => $r->lot_numero,
            'motif'              => $r->motif,
            'description'        => $r->description,
            'montant'            => round($r->montant, 2),
            'date_demande'       => $r->date_demande->toDateString(),
            'date_paiement'      => $r->date_paiement?->toDateString(),
            'mode_paiement'      => $r->mode_paiement,
            'reference'          => $r->reference,
            'statut'             => $r->statut,
        ];
    }
}
