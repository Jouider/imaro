<?php

namespace App\Http\Controllers\Api\Resident;

use App\Http\Controllers\Controller;
use App\Models\Assemblee;
use App\Models\Lot;
use App\Models\Residence;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * GET /api/portail/assemblees
 * Contrat front : { assemblees: AssembleePortail[] }
 *   AssembleePortail = { id, titre, type:'ordinaire'|'extraordinaire', date(ISO),
 *     lieu, statut:'convoquee'|'tenue'|'annulee', quorum_requis,
 *     participants_count, ordre_du_jour, residence_name }
 */
class PortailAssembleeController extends Controller
{
    public function __invoke(Request $request): JsonResponse
    {
        $user = $request->user();
        $lotId = $user->coproprietaire?->lot_id;
        $residenceId = $lotId ? Lot::withoutGlobalScope('tenant')->find($lotId)?->residence_id : null;
        $residence = $residenceId ? Residence::withoutGlobalScope('tenant')->find($residenceId) : null;

        $assemblees = Assemblee::where('tenant_id', $user->tenant_id)   // tenant de l'utilisateur (robuste)
            ->where(function ($q) use ($residenceId) {
                $q->whereNull('residence_id');
                if ($residenceId) {
                    $q->orWhere('residence_id', $residenceId);
                }
            })
            ->orderByDesc('date')->get()
            ->map(fn ($a) => [
                'id' => $a->id,
                'titre' => $a->titre,
                'type' => $a->type ?? 'ordinaire',
                'date' => $a->date?->toIso8601String(),
                'lieu' => $a->lieu,
                // l'enum BDD est planifiee/tenue/annulee ; le front attend convoquee/tenue/annulee
                'statut' => $a->statut === 'planifiee' ? 'convoquee' : $a->statut,
                'quorum_requis' => $a->quorum_requis ?? 50,
                'participants_count' => null,
                'ordre_du_jour' => $a->ordre_du_jour ?? '',
                'residence_name' => $residence?->name ?? '',
            ]);

        return response()->json(['status' => 'success', 'data' => ['assemblees' => $assemblees]]);
    }
}
