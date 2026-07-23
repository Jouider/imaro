<?php

namespace App\Http\Controllers\Api\Gestionnaire;

use App\Http\Controllers\Api\Gestionnaire\Concerns\AuthorizesResidence;
use App\Http\Controllers\Controller;
use App\Http\Requests\Gestionnaire\StoreLotRequest;
use App\Http\Requests\Gestionnaire\UpdateLotRequest;
use App\Http\Resources\LotResource;
use App\Models\Immeuble;
use App\Models\Lot;
use App\Models\Paiement;
use App\Models\Residence;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class LotController extends Controller
{
    use AuthorizesResidence;

    /**
     * GET /api/gestionnaire/residences/{residence}/lots
     */
    public function index(Request $request, Residence $residence): JsonResponse
    {
        $this->authorizeResidence($request, $residence);

        $lots = $residence->lots()
            ->with('coproprietairePrincipal.user')
            ->orderBy('numero')
            ->get();

        return response()->json([
            'status' => 'success',
            'data' => [
                'lots' => LotResource::collection($lots),
                'total_tantieme' => $residence->total_tantieme,
                'sum_tantieme' => round($lots->sum('tantieme'), 2),
            ],
        ]);
    }

    /**
     * POST /api/gestionnaire/residences/{residence}/lots
     */
    /**
     * Immeuble porteur par défaut d'une résidence (KAN-150).
     *
     * Toutes les copropriétés ne sont pas découpées en bâtiments, et l'assistant
     * de création permet de sauter cette étape. Or `lots.immeuble_id` est NOT NULL :
     * sans immeuble, aucun lot n'était créable — la génération renvoyait 0 ligne
     * créée, sans erreur visible côté utilisateur. On matérialise donc un bâtiment
     * unique à la demande, transparent pour l'utilisateur.
     */
    private function immeubleParDefaut(Residence $residence): Immeuble
    {
        $immeuble = $residence->immeubles()->first();
        if ($immeuble) {
            return $immeuble;
        }

        return Immeuble::create([
            'tenant_id' => config('app.tenant_id'),
            'residence_id' => $residence->id,
            'nom' => $residence->name,
            'nb_etages' => 0,
            'nb_lots' => 0,
        ]);
    }

    public function store(StoreLotRequest $request, Residence $residence): JsonResponse
    {
        $this->authorizeResidence($request, $residence);

        // Résoudre l'immeuble cible. Un id explicite doit exister ; sans id, on
        // retombe sur l'immeuble par défaut de la résidence (créé au besoin).
        $immeuble = $request->immeuble_id
            ? Immeuble::where('id', $request->immeuble_id)
                ->where('residence_id', $residence->id)
                ->firstOrFail()
            : $this->immeubleParDefaut($residence);

        // Validation tantième uniquement en mode tantieme
        $newTantieme = $request->tantieme ?? 0;
        if ($residence->mode_cotisation === 'tantieme' && $newTantieme > 0) {
            $totalTantieme = $this->getTotalTantiemeScope($immeuble, $residence);
            $currentSum = $this->getCurrentTantiemeSum($immeuble, $residence);

            if ($currentSum + $newTantieme > $totalTantieme) {
                $remaining = $totalTantieme - $currentSum;

                return response()->json([
                    'status' => 'error',
                    'message' => "Tantième invalide. Restant disponible : {$remaining}.",
                    'errors' => ['tantieme' => ["La somme dépasserait {$totalTantieme}. Restant : {$remaining}."]],
                ], 422);
            }
        }

        $lot = Lot::create([
            'tenant_id' => config('app.tenant_id'),
            'residence_id' => $residence->id,
            'immeuble_id' => $immeuble->id,
            'categorie_lot_id' => $request->categorie_lot_id,
            'numero' => $request->numero,
            'titre_foncier' => $request->titre_foncier,
            'type' => $request->type,
            'etage' => $request->etage ?? 0,
            'superficie' => $request->superficie,
            'tantieme' => $newTantieme,
        ]);

        $residence->increment('nb_lots');
        $immeuble->increment('nb_lots');

        $lot->load('coproprietairePrincipal.user', 'immeuble');

        return response()->json([
            'status' => 'success',
            'message' => 'Lot créé',
            'data' => ['lot' => new LotResource($lot)],
        ], 201);
    }

    /**
     * PUT /api/gestionnaire/residences/{residence}/lots/{lot}
     */
    public function update(UpdateLotRequest $request, Residence $residence, Lot $lot): JsonResponse
    {
        $this->authorizeResidence($request, $residence);
        abort_if($lot->residence_id !== $residence->id, 404);

        if ($request->has('tantieme')) {
            $currentSum = $residence->lots()->where('id', '!=', $lot->id)->sum('tantieme');
            $newTantieme = $request->tantieme;

            if ($currentSum + $newTantieme > $residence->total_tantieme) {
                $remaining = $residence->total_tantieme - $currentSum;

                return response()->json([
                    'status' => 'error',
                    'message' => "Tantième invalide. Restant disponible : {$remaining}.",
                    'errors' => ['tantieme' => ["La somme dépasserait {$residence->total_tantieme}. Restant : {$remaining}."]],
                ], 422);
            }
        }

        $lot->update($request->validated());
        $lot->load('coproprietairePrincipal.user');

        return response()->json([
            'status' => 'success',
            'message' => 'Lot mis à jour',
            'data' => ['lot' => new LotResource($lot)],
        ]);
    }

    /**
     * DELETE /api/gestionnaire/residences/{residence}/lots/{lot}
     */
    public function destroy(Request $request, Residence $residence, Lot $lot): JsonResponse
    {
        $this->authorizeResidence($request, $residence);
        abort_if($lot->residence_id !== $residence->id, 404);

        $hasUnpaid = $lot->coproprietaires()
            ->whereHas('appelsFondsLignes', fn ($q) => $q->where('statut', '!=', 'paye'))
            ->exists();

        if ($hasUnpaid) {
            return response()->json([
                'status' => 'error',
                'message' => 'Ce lot a des appels de fonds impayés. Réglez les impayés avant de supprimer.',
            ], 422);
        }

        $immeuble = $lot->immeuble;
        $lot->delete();
        $residence->decrement('nb_lots');
        $immeuble?->decrement('nb_lots');

        return response()->json([
            'status' => 'success',
            'message' => 'Lot supprimé',
        ]);
    }

    /**
     * PUT /api/gestionnaire/lots/{lot}  — route plate attendue par le frontend
     */
    public function updateFlat(UpdateLotRequest $request, Lot $lot): JsonResponse
    {
        $residence = $lot->residence;
        $this->authorizeResidence($request, $residence);

        return $this->update($request, $residence, $lot);
    }

    /**
     * DELETE /api/gestionnaire/lots/{lot}  — route plate attendue par le frontend
     */
    public function destroyFlat(Request $request, Lot $lot): JsonResponse
    {
        $residence = $lot->residence;
        $this->authorizeResidence($request, $residence);

        return $this->destroy($request, $residence, $lot);
    }

    /**
     * POST /api/gestionnaire/residences/{residence}/lots/bulk
     */
    public function bulkStore(Request $request, Residence $residence): JsonResponse
    {
        $this->authorizeResidence($request, $residence);

        $request->validate([
            'lots' => ['required', 'array', 'min:1', 'max:50'],
            'lots.*.numero' => ['required', 'string', 'max:20'],
            // Facultatif : cf. StoreLotRequest — se complète après génération (KAN-150).
            'lots.*.titre_foncier' => ['nullable', 'string', 'max:100'],
            'lots.*.categorie_lot_id' => [$residence->mode_cotisation === 'categorie' ? 'required' : 'nullable', Rule::exists('categories_lot', 'id')->where('residence_id', $residence->id)],
            'lots.*.type' => ['required', 'in:appartement,local_commercial,commerce,parking,cave,bureau,autre'],
            'lots.*.etage' => ['nullable', 'integer', 'min:-5', 'max:50'],
            'lots.*.superficie' => ['nullable', 'numeric', 'min:1'],
            'lots.*.tantieme' => ['required', 'numeric', 'min:0.01', 'max:1000'],
            'lots.*.immeuble_id' => ['nullable', 'integer'],
        ]);

        $defaultImmeuble = $this->immeubleParDefaut($residence);
        $created = 0;
        $errors = [];

        foreach ($request->lots as $index => $data) {
            $line = 'Ligne '.($index + 1);
            try {
                if (Lot::where('residence_id', $residence->id)->where('numero', $data['numero'])->exists()) {
                    $errors[] = "{$line}: lot '{$data['numero']}' existe déjà (ignoré).";

                    continue;
                }

                $immeuble = isset($data['immeuble_id'])
                    ? Immeuble::where('id', $data['immeuble_id'])->where('residence_id', $residence->id)->first()
                    : $defaultImmeuble;

                if (! $immeuble) {
                    $errors[] = "{$line}: immeuble introuvable.";

                    continue;
                }

                if ($residence->mode_cotisation === 'tantieme') {
                    $currentSum = $residence->lots()->sum('tantieme');
                    if ($currentSum + $data['tantieme'] > $residence->total_tantieme) {
                        $remaining = round($residence->total_tantieme - $currentSum, 2);
                        $errors[] = "{$line}: tantième invalide. Restant disponible : {$remaining}.";

                        continue;
                    }
                }

                Lot::create([
                    'tenant_id' => config('app.tenant_id'),
                    'residence_id' => $residence->id,
                    'immeuble_id' => $immeuble->id,
                    'categorie_lot_id' => $data['categorie_lot_id'] ?? null,
                    'numero' => $data['numero'],
                    'titre_foncier' => $data['titre_foncier'] ?? null,
                    'type' => $data['type'],
                    'etage' => $data['etage'] ?? 0,
                    'superficie' => $data['superficie'] ?? null,
                    'tantieme' => $data['tantieme'],
                ]);

                $residence->increment('nb_lots');
                $immeuble->increment('nb_lots');
                $created++;
            } catch (\Throwable $e) {
                $errors[] = "{$line}: ".$e->getMessage();
            }
        }

        return response()->json([
            'status' => 'success',
            'data' => ['created' => $created, 'errors' => $errors],
        ]);
    }

    /**
     * POST /api/gestionnaire/residences/{residence}/import-soldes
     * Importe les soldes initiaux des copropriétaires (par numéro de lot).
     */
    public function importSoldes(Request $request, Residence $residence): JsonResponse
    {
        $this->authorizeResidence($request, $residence);

        $request->validate([
            'soldes' => ['required', 'array', 'min:1', 'max:50'],
            'soldes.*.lot_numero' => ['nullable', 'string'],
            'soldes.*.lot_id' => ['nullable', 'integer'],
            'soldes.*.montant' => ['required', 'numeric'],
            'soldes.*.date' => ['nullable', 'date'],
            'soldes.*.date_arrete' => ['nullable', 'date'],
        ]);

        $imported = 0;
        $errors = [];

        foreach ($request->soldes as $index => $data) {
            $line = 'Ligne '.($index + 1);

            // Résoudre le lot par ID ou par numéro
            $lot = null;
            if (! empty($data['lot_id'])) {
                $lot = Lot::where('residence_id', $residence->id)->where('id', $data['lot_id'])->first();
            } elseif (! empty($data['lot_numero'])) {
                $lot = Lot::where('residence_id', $residence->id)->where('numero', $data['lot_numero'])->first();
            }
            $lotLabel = $data['lot_numero'] ?? $data['lot_id'] ?? '?';
            if (! $lot) {
                $errors[] = "{$line}: lot '{$lotLabel}' introuvable.";

                continue;
            }

            $copro = $lot->coproprietairePrincipal;
            if (! $copro) {
                $errors[] = "{$line}: aucun copropriétaire principal pour le lot '{$data['lot_numero']}'.";

                continue;
            }

            $copro->update(['solde_actuel' => (float) $data['montant']]);
            $imported++;
        }

        return response()->json([
            'status' => 'success',
            'data' => ['imported' => $imported, 'errors' => $errors],
        ]);
    }

    /**
     * POST /api/gestionnaire/residences/{residence}/import-paiements
     * Importe des paiements historiques (par numéro de lot).
     */
    public function importPaiements(Request $request, Residence $residence): JsonResponse
    {
        $this->authorizeResidence($request, $residence);

        $request->validate([
            'paiements' => ['required', 'array', 'min:1', 'max:50'],
            'paiements.*.lot_numero' => ['nullable', 'string'],
            'paiements.*.lot_id' => ['nullable', 'integer'],
            'paiements.*.coproprietaire_id' => ['nullable', 'integer'],
            'paiements.*.montant' => ['required', 'numeric', 'min:0.01'],
            'paiements.*.date' => ['nullable', 'date'],
            'paiements.*.date_paiement' => ['nullable', 'date'],
            'paiements.*.mode' => ['nullable', 'in:virement,cheque,especes,mobile,cb'],
            'paiements.*.reference' => ['nullable', 'string', 'max:100'],
            'paiements.*.note' => ['nullable', 'string', 'max:255'],
            'paiements.*.trimestre' => ['nullable', 'string', 'max:50'],
        ]);

        $imported = 0;
        $errors = [];

        foreach ($request->paiements as $index => $data) {
            $line = 'Ligne '.($index + 1);
            try {
                // Résoudre le lot par ID ou par numéro
                $lot = null;
                if (! empty($data['lot_id'])) {
                    $lot = Lot::where('residence_id', $residence->id)->where('id', $data['lot_id'])->first();
                } elseif (! empty($data['lot_numero'])) {
                    $lot = Lot::where('residence_id', $residence->id)->where('numero', $data['lot_numero'])->first();
                }
                $lotLabel = $data['lot_numero'] ?? $data['lot_id'] ?? '?';
                if (! $lot) {
                    $errors[] = "{$line}: lot '{$lotLabel}' introuvable.";

                    continue;
                }

                $copro = $lot->coproprietairePrincipal;
                if (! $copro) {
                    $errors[] = "{$line}: aucun copropriétaire principal pour le lot '{$data['lot_numero']}'.";

                    continue;
                }

                DB::transaction(function () use ($request, $data, $copro, $residence) {
                    $note = $data['note'] ?? 'Import';
                    if (! empty($data['trimestre'])) {
                        $note .= ' - '.$data['trimestre'];
                    }

                    $datePaiement = $data['date_paiement'] ?? $data['date'] ?? now()->toDateString();

                    // Retrouver l'exercice actif de la résidence pour le lier (best-effort)
                    $exerciceId = $residence->exercices()
                        ->where('statut', 'actif')
                        ->value('id');

                    Paiement::create([
                        'tenant_id' => config('app.tenant_id'),
                        'exercice_id' => $exerciceId,
                        'coproprietaire_id' => $copro->id,
                        'appel_fonds_ligne_id' => null,
                        'saisi_par' => $request->user()->id,
                        'montant' => $data['montant'],
                        'mode' => $data['mode'] ?? 'especes',
                        'reference' => $data['reference'] ?? null,
                        'note' => $note,
                        'date_paiement' => $datePaiement,
                    ]);

                    // Solde = paiements standalone ajoutés manuellement au solde actuel
                    $copro->update(['solde_actuel' => $copro->solde_actuel + $data['montant']]);
                });

                $imported++;
            } catch (\Throwable $e) {
                $errors[] = "{$line}: ".$e->getMessage();
            }
        }

        return response()->json([
            'status' => 'success',
            'data' => ['imported' => $imported, 'errors' => $errors],
        ]);
    }

    private function getTotalTantiemeScope(Immeuble $immeuble, Residence $residence): float
    {
        if ($immeuble->groupe_habitation_id && $immeuble->groupeHabitation) {
            return (float) $immeuble->groupeHabitation->total_tantieme;
        }

        return (float) $residence->total_tantieme;
    }

    private function getCurrentTantiemeSum(Immeuble $immeuble, Residence $residence): float
    {
        if ($immeuble->groupe_habitation_id) {
            return (float) Lot::whereHas('immeuble', function ($q) use ($immeuble) {
                $q->where('groupe_habitation_id', $immeuble->groupe_habitation_id);
            })->sum('tantieme');
        }

        return (float) $residence->lots()->sum('tantieme');
    }
}
