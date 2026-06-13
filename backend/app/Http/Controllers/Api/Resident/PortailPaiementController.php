<?php

namespace App\Http\Controllers\Api\Resident;

use App\Http\Controllers\Controller;
use App\Models\VirementDeclare;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * POST /api/portail/paiements
 * Le copropriétaire déclare un paiement effectué (virement, versement, chèque,
 * espèces) avec justificatif. Crée un virement « en_attente » que le
 * gestionnaire valide ensuite (→ Paiement réel).
 */
class PortailPaiementController extends Controller
{
    public function store(Request $request): JsonResponse
    {
        $copro = $request->user()->coproprietaire;
        abort_if(! $copro, 422, 'Aucun lot n\'est associé à votre compte.');

        $data = $request->validate([
            'montant'      => ['required', 'numeric', 'min:1'],
            'date'         => ['required', 'date'],
            'methode'      => ['required', 'in:virement,versement,cheque,especes'],
            'reference'    => ['nullable', 'string', 'max:255'],
            'justificatif' => ['nullable', 'file', 'mimes:pdf,jpg,jpeg,png', 'max:5120'],
        ]);

        $path = $request->hasFile('justificatif')
            ? $request->file('justificatif')->store('virements', 'public')
            : null;

        $residence = $copro->lot->residence;

        VirementDeclare::create([
            'tenant_id'         => $residence->tenant_id,
            'residence_id'      => $residence->id,
            'coproprietaire_id' => $copro->id,
            'montant'           => $data['montant'],
            'date_declaration'  => $data['date'],
            'methode'           => $data['methode'],
            'reference'         => $data['reference'] ?? null,
            'justificatif_path' => $path,
            'statut'            => 'en_attente',
        ]);

        return response()->json([
            'status'  => 'success',
            'message' => 'Paiement déclaré. Il sera validé par votre syndic.',
        ], 201);
    }
}
