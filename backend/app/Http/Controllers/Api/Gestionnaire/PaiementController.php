<?php

namespace App\Http\Controllers\Api\Gestionnaire;

use App\Http\Controllers\Api\Gestionnaire\Concerns\AuthorizesResidence;
use App\Http\Controllers\Controller;
use App\Http\Requests\Gestionnaire\StorePaiementRequest;
use App\Http\Resources\PaiementResource;
use App\Models\AppelFondsLigne;
use App\Models\Notification;
use App\Models\Paiement;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class PaiementController extends Controller
{
    use AuthorizesResidence;

    /**
     * GET /api/gestionnaire/paiements
     */
    public function index(Request $request): JsonResponse
    {
        $query = Paiement::with(['coproprietaire.user', 'coproprietaire.lot', 'appelFondsLigne.appelFonds', 'saisePar'])
            ->where('tenant_id', config('app.tenant_id'));

        if ($request->filled('residence_id')) {
            $query->whereHas(
                'coproprietaire.lot',
                fn ($q) => $q->where('residence_id', $request->residence_id)
            );
        }

        if ($request->filled('appel_fonds_id')) {
            $query->whereHas(
                'appelFondsLigne',
                fn ($q) => $q->where('appel_fonds_id', $request->appel_fonds_id)
            );
        }

        $paiements = $query->latest('date_paiement')->paginate($request->integer('per_page', 15));

        return response()->json([
            'status' => 'success',
            'data' => [
                'paiements' => PaiementResource::collection($paiements),
                'meta' => [
                    'total' => $paiements->total(),
                    'per_page' => $paiements->perPage(),
                    'current_page' => $paiements->currentPage(),
                    'last_page' => $paiements->lastPage(),
                ],
            ],
        ]);
    }

    /**
     * POST /api/gestionnaire/paiements
     * Enregistre un paiement et met à jour la ligne + statut appel de fonds.
     */
    public function store(StorePaiementRequest $request): JsonResponse
    {
        $ligne = AppelFondsLigne::with(['appelFonds.residence', 'coproprietaire'])->findOrFail($request->appel_fonds_ligne_id);

        $this->authorizeResidence($request, $ligne->appelFonds->residence);

        if ($ligne->statut === 'paye') {
            return response()->json([
                'status' => 'error',
                'message' => 'Cette ligne est déjà entièrement payée.',
            ], 422);
        }

        $paiement = DB::transaction(function () use ($request, $ligne) {
            $paiement = Paiement::create([
                'tenant_id' => config('app.tenant_id'),
                'coproprietaire_id' => $ligne->coproprietaire_id,
                'appel_fonds_ligne_id' => $ligne->id,
                'saisi_par' => $request->user()->id,
                'montant' => $request->montant,
                'mode' => $request->mode,
                'reference' => $request->reference,
                'note' => $request->note,
                'date_paiement' => $request->date_paiement,
            ]);

            // Mettre à jour montant_paye + statut de la ligne
            $nouveauMontantPaye = $ligne->montant_paye + $request->montant;
            $nouveauStatut = $nouveauMontantPaye >= $ligne->montant_du ? 'paye' : 'partiel';

            $ligne->update([
                'montant_paye' => min($nouveauMontantPaye, $ligne->montant_du),
                'statut' => $nouveauStatut,
                'date_paiement' => $nouveauStatut === 'paye' ? $request->date_paiement : $ligne->date_paiement,
            ]);

            // Recalculer le solde du copropriétaire
            $ligne->coproprietaire->recalculerSolde();

            // Mettre à jour le statut de l'appel de fonds
            $this->recalculerStatutAppelFonds($ligne->appelFonds);

            return $paiement;
        });

        $paiement->load(['coproprietaire.user', 'coproprietaire.lot', 'appelFondsLigne.appelFonds', 'saisePar']);

        return response()->json([
            'status' => 'success',
            'message' => 'Paiement enregistré',
            'data' => ['paiement' => new PaiementResource($paiement)],
        ], 201);
    }

    /**
     * POST /api/gestionnaire/paiements/{paiement}/cheque-impaye (KAN-85)
     * Marque un paiement par chèque comme rejeté : annule son effet (ligne + solde)
     * et notifie le résident. Une contre-passation apparaît au journal comptable.
     */
    public function chequeImpaye(Request $request, Paiement $paiement): JsonResponse
    {
        $paiement->load(['appelFondsLigne.appelFonds.residence', 'coproprietaire.user', 'coproprietaire.lot.residence']);

        if ($paiement->mode !== 'cheque') {
            return response()->json(['status' => 'error', 'message' => 'Ce paiement n\'est pas un chèque.'], 422);
        }
        if ($paiement->statut === 'cheque_rejete') {
            return response()->json(['status' => 'error', 'message' => 'Ce chèque est déjà marqué impayé.'], 422);
        }

        $residence = $paiement->appelFondsLigne?->appelFonds?->residence
            ?? $paiement->coproprietaire?->lot?->residence;
        abort_if(! $residence, 422, 'Résidence introuvable pour ce paiement.');
        $this->authorizeResidence($request, $residence);

        $motif = $request->validate(['motif' => ['nullable', 'string', 'max:255']])['motif'] ?? null;

        DB::transaction(function () use ($paiement, $motif) {
            // Revenir sur la ligne d'appel de fonds le cas échéant.
            if ($ligne = $paiement->appelFondsLigne) {
                $newPaye = max(0, round($ligne->montant_paye - $paiement->montant, 2));
                $statut = $newPaye <= 0 ? 'impaye' : ($newPaye >= $ligne->montant_du ? 'paye' : 'partiel');
                $ligne->update(['montant_paye' => $newPaye, 'statut' => $statut]);
                $this->recalculerStatutAppelFonds($ligne->appelFonds);
            }

            $paiement->update([
                'statut' => 'cheque_rejete',
                'cheque_rejete_at' => now(),
                'motif_rejet' => $motif,
            ]);

            $paiement->coproprietaire?->recalculerSolde();

            if ($userId = $paiement->coproprietaire?->user_id) {
                Notification::create([
                    'tenant_id' => $paiement->tenant_id,
                    'user_id' => $userId,
                    'type' => 'paiement',
                    'title' => 'Chèque rejeté',
                    'message' => 'Votre chèque de '.number_format($paiement->montant, 2, ',', ' ').' DH'
                        .($paiement->reference ? ' (réf. '.$paiement->reference.')' : '')
                        .' a été rejeté par la banque. Le montant reste dû.',
                    'read' => false,
                    'data' => ['paiement_id' => $paiement->id, 'montant' => $paiement->montant, 'motif' => $motif],
                ]);
            }
        });

        $paiement->load(['coproprietaire.user', 'coproprietaire.lot', 'appelFondsLigne.appelFonds', 'saisePar']);

        return response()->json([
            'status' => 'success',
            'message' => 'Chèque marqué impayé. Le solde du copropriétaire a été régularisé.',
            'data' => ['paiement' => new PaiementResource($paiement)],
        ]);
    }

    private function recalculerStatutAppelFonds($appelFonds): void
    {
        $lignes = $appelFonds->lignes()->get();
        $total = $lignes->count();
        $payes = $lignes->where('statut', 'paye')->count();

        if ($payes === $total) {
            $appelFonds->update(['statut' => 'solde']);
        } elseif ($payes > 0 || $lignes->where('statut', 'partiel')->count() > 0) {
            $appelFonds->update(['statut' => 'partiel']);
        }
    }
}
