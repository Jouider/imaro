<?php

namespace App\Http\Controllers\Api\Resident;

use App\Http\Controllers\Controller;
use App\Models\Document;
use App\Models\Lot;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

/**
 * GET /api/portail/documents
 * Contrat front : { documents: PortailDocument[] }
 *   PortailDocument = { id, nom, type:'reglement'|'pv_ag'|'contrat_facture'|'autre',
 *     date, url, taille_ko }
 */
class PortailDocumentController extends Controller
{
    public function __invoke(Request $request): JsonResponse
    {
        $user = $request->user();
        $residenceId = $this->residentResidenceId($user);

        $documents = Document::where('tenant_id', $user->tenant_id)   // tenant de l'utilisateur (robuste)
            ->where(function ($q) use ($residenceId) {                // docs de sa résidence + globaux
                $q->whereNull('residence_id');
                if ($residenceId) {
                    $q->orWhere('residence_id', $residenceId);
                }
            })
            ->orderByDesc('date')->orderByDesc('created_at')->get()
            ->map(fn ($d) => [
                'id' => $d->id,
                'nom' => $d->nom,
                // enum BDD reglement/pv_ag/contrat/facture/autre → 4 types front
                'type' => in_array($d->type, ['contrat', 'facture'], true) ? 'contrat_facture'
                    : (in_array($d->type, ['reglement', 'pv_ag'], true) ? $d->type : 'autre'),
                'date' => ($d->date ?? $d->created_at)?->toDateString(),
                'url' => $d->file_path ? Storage::disk('public')->url($d->file_path) : '',
                'taille_ko' => $d->taille_ko ?? 0,
            ]);

        return response()->json(['status' => 'success', 'data' => ['documents' => $documents]]);
    }

    private function residentResidenceId(User $user): ?int
    {
        $lotId = $user->coproprietaire?->lot_id;

        return $lotId ? Lot::withoutGlobalScope('tenant')->find($lotId)?->residence_id : null;
    }
}
