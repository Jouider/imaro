<?php

namespace App\Http\Controllers\Api\Gestionnaire;

use App\Http\Controllers\Controller;
use App\Http\Requests\Gestionnaire\StorePaiementRequest;
use App\Http\Resources\PaiementResource;
use App\Models\AppelFondsLigne;
use App\Models\Paiement;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class PaiementController extends Controller
{
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

        // Vérifier que la résidence appartient au gestionnaire
        abort_if(
            $ligne->appelFonds->residence->gestionnaire_id !== $request->user()->id,
            403,
            'Accès refusé.'
        );

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
