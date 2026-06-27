<?php

namespace App\Http\Controllers\Api\Gestionnaire;

use App\Http\Controllers\Api\Gestionnaire\Concerns\AuthorizesResidence;
use App\Http\Controllers\Controller;
use App\Http\Resources\BonPaiementResource;
use App\Jobs\GenerateBonPaiementPdfJob;
use App\Models\BonPaiement;
use App\Models\Ticket;
use App\Services\Notifications\PortailPushNotifier;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * Bons de paiement émis par les résidents, à valider par le syndic (KAN-110 / #322).
 * Validation possible seulement après le délai légal de 24 h (validable_at) ;
 * à la validation : ticket de suivi + PDF (async) + notification du résident.
 */
class BonPaiementController extends Controller
{
    use AuthorizesResidence;

    public function index(Request $request): JsonResponse
    {
        $bons = BonPaiement::with(['coproprietaire.user', 'coproprietaire.lot', 'ticket', 'validePar'])
            ->whereIn('residence_id', $this->accessibleResidenceIds($request))
            ->orderByRaw("FIELD(statut,'en_attente','valide','rejete','expire')")
            ->orderByDesc('created_at')
            ->get();

        return response()->json([
            'status' => 'success',
            'data' => ['bons' => BonPaiementResource::collection($bons)],
        ]);
    }

    public function valider(Request $request, int $id): JsonResponse
    {
        $bon = $this->findAccessible($request, $id);

        abort_if($bon->statut !== 'en_attente', 422, 'Ce bon a déjà été traité.');
        abort_unless($bon->estValidable(), 422, 'Validation impossible avant le délai légal de 24 h.');

        DB::transaction(function () use ($request, $bon) {
            $copro = $bon->coproprietaire;

            // Ticket de suivi (réutilise le module tickets) : le résident le suit
            // dans son portail réclamations. La table tickets n'a pas de titre →
            // sujet plié dans la description (même convention que les réclamations).
            $ticket = Ticket::create([
                'tenant_id' => $bon->tenant_id,
                'residence_id' => $bon->residence_id,
                'user_id' => $copro?->user_id,
                'lot_id' => $copro?->lot_id,
                'categorie' => 'autre',
                'description' => "Suivi bon de paiement {$bon->reference}\n\n"
                    .number_format((float) $bon->montant, 2, ',', ' ')." DH — {$bon->beneficiaire}\nMotif : {$bon->motif}",
                'priorite' => 'normal',
                'statut' => 'ouvert',
            ]);

            $bon->update([
                'statut' => 'valide',
                'validated_at' => now(),
                'valide_par' => $request->user()->id,
                'ticket_id' => $ticket->id,
            ]);
        });

        // PDF généré en asynchrone (jamais dans le cycle requête — cf. CLAUDE.md).
        GenerateBonPaiementPdfJob::dispatch($bon->id);

        // Notification résident (best-effort, async). $bon a déjà coproprietaire chargé.
        app(PortailPushNotifier::class)->bonPaiementValide($bon);

        return response()->json([
            'status' => 'success',
            'message' => 'Bon de paiement validé.',
            'data' => ['bon' => new BonPaiementResource($bon->fresh(['ticket']))],
        ]);
    }

    public function rejeter(Request $request, int $id): JsonResponse
    {
        $bon = $this->findAccessible($request, $id);
        abort_if($bon->statut !== 'en_attente', 422, 'Ce bon a déjà été traité.');

        $data = $request->validate(['motif' => 'nullable|string|max:500']);

        $bon->update([
            'statut' => 'rejete',
            'motif_rejet' => $data['motif'] ?? null,
            'valide_par' => $request->user()->id,
            'validated_at' => now(),
        ]);

        return response()->json([
            'status' => 'success',
            'message' => 'Bon de paiement rejeté.',
            'data' => ['bon' => new BonPaiementResource($bon->fresh(['ticket']))],
        ]);
    }

    private function findAccessible(Request $request, int $id): BonPaiement
    {
        $bon = BonPaiement::with(['coproprietaire.user', 'coproprietaire.lot', 'ticket'])->findOrFail($id);
        abort_unless(
            $this->accessibleResidenceIds($request)->contains($bon->residence_id),
            403,
            'Accès refusé.'
        );

        return $bon;
    }
}
