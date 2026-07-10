<?php

namespace App\Http\Controllers\Api\Gestionnaire;

use App\Http\Controllers\Api\Gestionnaire\Concerns\AuthorizesResidence;
use App\Http\Controllers\Api\Gestionnaire\Concerns\GuardsClosedExercice;
use App\Http\Controllers\Controller;
use App\Http\Requests\Gestionnaire\StoreAppelFondsRequest;
use App\Http\Requests\Gestionnaire\UpdateAppelFondsRequest;
use App\Http\Resources\AppelFondsResource;
use App\Models\AppelFonds;
use App\Models\Residence;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AppelFondsController extends Controller
{
    use AuthorizesResidence, GuardsClosedExercice;

    /**
     * GET /api/gestionnaire/appels-fonds
     */
    public function index(Request $request): JsonResponse
    {
        $query = AppelFonds::with(['residence', 'exercice', 'createdBy', 'lignes'])
            ->whereHas('residence', $this->residenceScope($request));

        if ($request->filled('residence_id')) {
            $query->where('residence_id', $request->residence_id);
        }

        if ($request->filled('statut')) {
            $query->where('appels_fonds.statut', $request->statut);
        }

        $appelsFonds = $query->latest()->paginate($request->integer('per_page', 15));

        return response()->json([
            'status' => 'success',
            'data' => [
                'appels_fonds' => AppelFondsResource::collection($appelsFonds),
                'meta' => [
                    'total' => $appelsFonds->total(),
                    'per_page' => $appelsFonds->perPage(),
                    'current_page' => $appelsFonds->currentPage(),
                    'last_page' => $appelsFonds->lastPage(),
                ],
            ],
        ]);
    }

    /**
     * POST /api/gestionnaire/appels-fonds
     * Crée l'appel de fonds et génère automatiquement les lignes par tantième.
     */
    public function store(StoreAppelFondsRequest $request): JsonResponse
    {
        $residence = Residence::findOrFail($request->residence_id);
        $this->authorizeResidence($request, $residence);
        $this->abortIfExerciceCloture($request->exercice_id);

        $appelFonds = AppelFonds::create([
            'tenant_id' => config('app.tenant_id'),
            'residence_id' => $request->residence_id,
            'exercice_id' => $request->exercice_id,
            'created_by' => $request->user()->id,
            'libelle' => $request->titre ?? $request->libelle,  // frontend envoie 'titre'
            'description' => $request->description,
            'montant_total' => $request->montant_total,
            'date_echeance' => $request->date_echeance,
            'statut' => 'brouillon',
        ]);

        $appelFonds->genererLignes();

        $appelFonds->load(['residence', 'exercice', 'createdBy', 'lignes.coproprietaire.user', 'lignes.coproprietaire.lot']);
        $appelFonds->setRelation('lignesDetail', $appelFonds->getRelation('lignes'));

        return response()->json([
            'status' => 'success',
            'message' => 'Appel de fonds créé — '.$appelFonds->lignes->count().' lignes générées',
            'data' => ['appel_fonds' => new AppelFondsResource($appelFonds)],
        ], 201);
    }

    /**
     * GET /api/gestionnaire/appels-fonds/{appelFonds}
     */
    public function show(Request $request, AppelFonds $appelFonds): JsonResponse
    {
        $this->authorizeAppelFonds($request, $appelFonds);

        $appelFonds->load(['residence', 'exercice', 'createdBy', 'lignes.coproprietaire.user', 'lignes.coproprietaire.lot']);
        $appelFonds->setRelation('lignesDetail', $appelFonds->getRelation('lignes'));

        return response()->json([
            'status' => 'success',
            'data' => ['appel_fonds' => new AppelFondsResource($appelFonds)],
        ]);
    }

    /**
     * PUT /api/gestionnaire/appels-fonds/{appelFonds}
     * Modification uniquement si statut = brouillon.
     */
    public function update(UpdateAppelFondsRequest $request, AppelFonds $appelFonds): JsonResponse
    {
        $this->authorizeAppelFonds($request, $appelFonds);

        if ($appelFonds->statut !== 'brouillon') {
            return response()->json([
                'status' => 'error',
                'message' => 'Seul un appel de fonds en brouillon peut être modifié.',
            ], 422);
        }

        $appelFonds->update($request->validated());

        // Régénérer les lignes si le montant_total a changé
        if ($request->has('montant_total')) {
            $appelFonds->lignes()->delete();
            $appelFonds->genererLignes();
        }

        $appelFonds->load(['residence', 'createdBy', 'lignes']);

        return response()->json([
            'status' => 'success',
            'message' => 'Appel de fonds mis à jour',
            'data' => ['appel_fonds' => new AppelFondsResource($appelFonds)],
        ]);
    }

    /**
     * POST /api/gestionnaire/appels-fonds/{appelFonds}/envoyer
     * Passe brouillon → envoye.
     */
    public function envoyer(Request $request, AppelFonds $appelFonds): JsonResponse
    {
        $this->authorizeAppelFonds($request, $appelFonds);

        if ($appelFonds->statut !== 'brouillon') {
            return response()->json([
                'status' => 'error',
                'message' => "Statut actuel '{$appelFonds->statut}' — seul un brouillon peut être envoyé.",
            ], 422);
        }

        if ($appelFonds->lignes()->count() === 0) {
            return response()->json([
                'status' => 'error',
                'message' => 'Impossible d\'envoyer : aucune ligne générée (résidence sans lots ou sans copropriétaires).',
            ], 422);
        }

        $appelFonds->update([
            'statut' => 'envoye',
            'sent_at' => Carbon::now(),
        ]);

        // TODO KAN-16 : dispatch(new SendAppelFondsNotification($appelFonds)) — WhatsApp à tous les copropriétaires

        $appelFonds->load(['residence', 'lignes']);

        return response()->json([
            'status' => 'success',
            'message' => 'Appel de fonds envoyé — notifications WhatsApp à programmer (KAN-16)',
            'data' => ['appel_fonds' => new AppelFondsResource($appelFonds)],
        ]);
    }

    private function authorizeAppelFonds(Request $request, AppelFonds $appelFonds): void
    {
        $appelFonds->load('residence');
        $this->authorizeResidence($request, $appelFonds->residence);
    }
}
