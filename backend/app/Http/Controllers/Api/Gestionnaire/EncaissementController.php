<?php

namespace App\Http\Controllers\Api\Gestionnaire;

use App\Http\Controllers\Api\Gestionnaire\Concerns\GuardsClosedExercice;
use App\Http\Controllers\Controller;
use App\Jobs\GenerateRecuPaiementJob;
use App\Models\AppelFondsLigne;
use App\Models\Coproprietaire;
use App\Models\Paiement;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class EncaissementController extends Controller
{
    use GuardsClosedExercice;

    /**
     * GET /api/gestionnaire/encaissements
     */
    public function index(Request $request): JsonResponse
    {
        $tenantId = config('app.tenant_id');

        $query = Paiement::where('tenant_id', $tenantId)
            ->with(['coproprietaire.user:id,name', 'coproprietaire.lot:id,numero', 'appelFondsLigne.appelFonds:id,libelle'])
            ->orderByDesc('date_paiement');

        if ($request->query('methode')) {
            $query->where('mode', $request->query('methode'));
        }
        if ($request->query('from')) {
            $query->where('date_paiement', '>=', $request->query('from'));
        }
        if ($request->query('to')) {
            $query->where('date_paiement', '<=', $request->query('to'));
        }

        $encaissements = $query->get()->map(fn (Paiement $p) => [
            'id' => $p->id,
            'creance_id' => $p->appel_fonds_ligne_id,
            'coproprietaire_id' => $p->coproprietaire_id,
            'coproprietaire_nom' => $p->coproprietaire?->user?->name ?? '',
            'lot_numero' => $p->coproprietaire?->lot?->numero ?? '',
            'appel_fonds_titre' => $p->appelFondsLigne?->appelFonds?->libelle ?? '',
            'montant' => round((float) $p->montant, 2),
            'date_paiement' => $p->date_paiement?->toDateString(),
            'methode' => $p->mode ?? 'virement',
            'reference_cheque' => $p->reference,
            'compte_destination' => '5121',
            'est_avance' => false,
            'recu_path' => null,
            'est_rapproche' => false,
            // Suivi chèque impayé (KAN-85 / #338) — mêmes champs que PaiementResource,
            // pour que le badge « Chèque rejeté » persiste après refetch.
            'statut' => $p->statut ?? 'valide',
            'cheque_rejete_at' => $p->cheque_rejete_at?->toIso8601String(),
            'motif_rejet' => $p->motif_rejet,
        ]);

        return response()->json([
            'status' => 'success',
            'data' => $encaissements->values(),
        ]);
    }

    /**
     * POST /api/gestionnaire/encaissements
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'creance_id' => 'nullable|integer',
            'montant' => 'required|numeric|min:0',
            'date_paiement' => 'required|date',
            'methode' => 'required|string',
            'reference_cheque' => 'nullable|string',
            'compte_destination' => 'nullable|string',
        ]);

        // Find the appel_fonds_ligne to get coproprietaire + exercice
        $ligne = null;
        if ($validated['creance_id']) {
            $ligne = AppelFondsLigne::with('appelFonds')->find($validated['creance_id']);
        }

        $this->abortIfExerciceCloture($ligne?->appelFonds?->exercice_id);

        $paiement = Paiement::create([
            'tenant_id' => config('app.tenant_id'),
            'coproprietaire_id' => $ligne?->coproprietaire_id ?? $request->input('coproprietaire_id'),
            'appel_fonds_id' => $ligne?->appel_fonds_id,
            'appel_fonds_ligne_id' => $ligne?->id,
            'exercice_id' => $ligne?->appelFonds?->exercice_id,
            'montant' => $validated['montant'],
            'date_paiement' => $validated['date_paiement'],
            'mode' => $validated['methode'],
            'reference' => $validated['reference_cheque'] ?? null,
            'statut' => 'valide',
        ]);

        // Update ligne montant_paye if linked
        if ($ligne) {
            $ligne->increment('montant_paye', $validated['montant']);
            if ($ligne->montant_paye >= $ligne->montant_du) {
                $ligne->update(['statut' => 'paye']);
            }
        }

        // Rafraîchit le solde du copropriétaire + génère le reçu PDF (async).
        // Best-effort (KAN-116) : un échec du recalcul de solde ou de la file de
        // génération du reçu ne doit PAS faire échouer l'encaissement lui-même
        // (le paiement est déjà enregistré). On journalise et on continue.
        if ($paiement->coproprietaire_id) {
            try {
                Coproprietaire::find($paiement->coproprietaire_id)?->recalculerSolde();
                GenerateRecuPaiementJob::dispatch($paiement->id);
            } catch (\Throwable $e) {
                report($e);
            }
        }

        $paiement->load(['coproprietaire.user:id,name', 'coproprietaire.lot:id,numero']);

        return response()->json([
            'status' => 'success',
            'message' => 'Encaissement enregistré.',
            'data' => [
                'id' => $paiement->id,
                'creance_id' => $paiement->appel_fonds_ligne_id,
                'coproprietaire_id' => $paiement->coproprietaire_id,
                'coproprietaire_nom' => $paiement->coproprietaire?->user?->name ?? '',
                'lot_numero' => $paiement->coproprietaire?->lot?->numero ?? '',
                'appel_fonds_titre' => '',
                'montant' => round((float) $paiement->montant, 2),
                'date_paiement' => $paiement->date_paiement?->toDateString(),
                'methode' => $paiement->mode,
                'reference_cheque' => $paiement->reference,
                'compte_destination' => $validated['compte_destination'] ?? '5121',
                'est_avance' => false,
                'recu_path' => null,
                'est_rapproche' => false,
            ],
        ], 201);
    }
}
