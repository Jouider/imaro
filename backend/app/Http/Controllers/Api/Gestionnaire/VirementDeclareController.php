<?php

namespace App\Http\Controllers\Api\Gestionnaire;

use App\Http\Controllers\Api\Gestionnaire\Concerns\AuthorizesResidence;
use App\Http\Controllers\Controller;
use App\Models\Exercice;
use App\Models\Paiement;
use App\Models\VirementDeclare;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * Virements/paiements déclarés par les résidents, à valider par le gestionnaire.
 * Validation → crée un Paiement réel + met à jour le solde du copropriétaire.
 */
class VirementDeclareController extends Controller
{
    use AuthorizesResidence;

    private const MODE_MAP = [
        'virement'  => 'virement',
        'versement' => 'virement',
        'cheque'    => 'cheque',
        'especes'   => 'especes',
    ];

    public function index(Request $request): JsonResponse
    {
        $residenceIds = $this->accessibleResidenceIds($request);

        $virements = VirementDeclare::whereIn('residence_id', $residenceIds)
            ->with(['coproprietaire.user', 'coproprietaire.lot', 'validePar'])
            ->orderByRaw("FIELD(statut,'en_attente','valide','rejete')")
            ->orderByDesc('date_declaration')
            ->get();

        return response()->json([
            'status' => 'success',
            'data'   => $virements->map(fn ($v) => $this->present($v))->values(),
        ]);
    }

    public function valider(Request $request, int $id): JsonResponse
    {
        $virement = $this->findAccessible($request, $id);
        abort_if($virement->statut !== 'en_attente', 422, 'Ce virement a déjà été traité.');

        DB::transaction(function () use ($request, $virement) {
            $copro = $virement->coproprietaire;
            $exercice = Exercice::where('residence_id', $virement->residence_id)
                ->where('statut', 'actif')->first();

            $paiement = Paiement::create([
                'tenant_id'         => $virement->tenant_id,
                'exercice_id'       => $exercice?->id,
                'coproprietaire_id' => $copro->id,
                'saisi_par'         => $request->user()->id,
                'montant'           => $virement->montant,
                'mode'              => self::MODE_MAP[$virement->methode] ?? 'virement',
                'reference'         => $virement->reference,
                'note'              => 'Virement déclaré par le copropriétaire (validé).',
                'date_paiement'     => $virement->date_declaration,
            ]);

            $virement->update([
                'statut'          => 'valide',
                'valide_par'      => $request->user()->id,
                'date_validation' => now(),
                'paiement_id'     => $paiement->id,
            ]);

            $copro->recalculerSolde();
        });

        return response()->json([
            'status'  => 'success',
            'message' => 'Virement validé — paiement enregistré.',
            'data'    => $this->present($virement->fresh(['coproprietaire.user', 'coproprietaire.lot', 'validePar'])),
        ]);
    }

    public function rejeter(Request $request, int $id): JsonResponse
    {
        $virement = $this->findAccessible($request, $id);
        abort_if($virement->statut !== 'en_attente', 422, 'Ce virement a déjà été traité.');

        $data = $request->validate(['motif' => ['nullable', 'string', 'max:500']]);

        $virement->update([
            'statut'          => 'rejete',
            'motif_rejet'     => $data['motif'] ?? null,
            'valide_par'      => $request->user()->id,
            'date_validation' => now(),
        ]);

        return response()->json([
            'status'  => 'success',
            'message' => 'Virement rejeté.',
            'data'    => $this->present($virement->fresh(['coproprietaire.user', 'coproprietaire.lot', 'validePar'])),
        ]);
    }

    private function findAccessible(Request $request, int $id): VirementDeclare
    {
        $virement = VirementDeclare::with(['coproprietaire.user', 'coproprietaire.lot'])->findOrFail($id);
        abort_unless($this->accessibleResidenceIds($request)->contains($virement->residence_id), 403, 'Accès refusé.');

        return $virement;
    }

    private function present(VirementDeclare $v): array
    {
        return [
            'id'                => $v->id,
            'coproprietaire_id' => $v->coproprietaire_id,
            'coproprietaire_nom' => $v->coproprietaire?->user?->name ?? '—',
            'lot_numero'        => $v->coproprietaire?->lot?->numero ?? '—',
            'montant'           => round((float) $v->montant, 2),
            'date_declaration'  => $v->date_declaration?->toDateString(),
            'methode'           => $v->methode,
            'reference'         => $v->reference,
            'justificatif_path' => $v->justificatif_path,
            'statut'            => $v->statut,
            'valide_par'        => $v->validePar?->name,
            'date_validation'   => $v->date_validation?->toDateTimeString(),
        ];
    }
}
