<?php

namespace App\Http\Controllers\Api\Resident;

use App\Http\Controllers\Controller;
use App\Models\CompteBancaire;
use App\Models\Lot;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * GET /api/portail/comptes-bancaires
 * RIB/IBAN du syndicat de la résidence du résident, pour effectuer un virement.
 */
class PortailBankAccountController extends Controller
{
    public function __invoke(Request $request): JsonResponse
    {
        $copro = $request->user()->coproprietaire;
        // withoutGlobalScope : le lot/résidence doit se résoudre même si le
        // contexte tenant de la requête (config app.tenant_id) n'est pas posé.
        $residenceId = $copro?->lot_id
            ? Lot::withoutGlobalScope('tenant')->find($copro->lot_id)?->residence_id
            : null;

        $comptes = $residenceId
            ? CompteBancaire::where('residence_id', $residenceId)
                ->orderByDesc('is_primary')->orderBy('id')->get()
            : collect();

        return response()->json([
            'status' => 'success',
            'data'   => [
                'comptes' => $comptes->map(fn ($c) => [
                    'id'         => $c->id,
                    'banque'     => $c->banque,
                    'titulaire'  => $c->titulaire,
                    'rib'        => $c->rib,
                    'iban'       => $c->iban,
                    'is_primary' => $c->is_primary,
                ])->values(),
            ],
        ]);
    }
}
