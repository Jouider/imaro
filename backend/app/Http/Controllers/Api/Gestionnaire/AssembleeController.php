<?php

namespace App\Http\Controllers\Api\Gestionnaire;

use App\Http\Controllers\Api\Gestionnaire\Concerns\AuthorizesResidence;
use App\Http\Controllers\Controller;
use App\Http\Resources\AssembleeResource;
use App\Jobs\GenerateConvocationsJob;
use App\Models\Assemblee;
use App\Models\Convocation;
use App\Models\Lot;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;

class AssembleeController extends Controller
{
    use AuthorizesResidence;

    public function index(Request $request): JsonResponse
    {
        $residenceIds = $this->accessibleResidenceIds($request);

        $assemblees = Assemblee::with('residence')
            ->where('tenant_id', config('app.tenant_id'))
            ->whereIn('residence_id', $residenceIds)
            ->orderByDesc('date')
            ->get();

        return response()->json([
            'status' => 'success',
            'data' => ['assemblees' => AssembleeResource::collection($assemblees)],
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'titre' => 'required|string|max:255',
            'type' => ['required', Rule::in(['ordinaire', 'extraordinaire'])],
            'residence_id' => 'required|exists:residences,id',
            'date' => 'required|date',
            'lieu' => 'nullable|string|max:255',
            'quorum_requis' => 'nullable|integer|min:1|max:100',
            'ordre_du_jour' => 'nullable|string',
        ]);

        $assemblee = Assemblee::create([
            'tenant_id' => config('app.tenant_id'),
            'created_by' => $request->user()->id,
            'titre' => $data['titre'],
            'type' => $data['type'],
            'residence_id' => $data['residence_id'],
            'date' => $data['date'],
            'lieu' => $data['lieu'] ?? null,
            'quorum_requis' => $data['quorum_requis'] ?? 50,
            'ordre_du_jour' => $data['ordre_du_jour'] ?? null,
            'statut' => 'planifiee',
        ]);

        $assemblee->load('residence');

        return response()->json([
            'status' => 'success',
            'message' => 'Assemblée créée',
            'data' => ['assemblee' => new AssembleeResource($assemblee)],
        ], 201);
    }

    /**
     * POST /api/gestionnaire/assemblees/{assemblee}/convocations (KAN-98 / #269)
     * Génère (async) une convocation PDF par copropriétaire + le PDF fusionné.
     */
    public function genererConvocations(Request $request, Assemblee $assemblee): JsonResponse
    {
        $this->authorizeAssemblee($request, $assemblee);

        // Un clic répété (ou un retry frontend) pendant qu'une génération tourne
        // déjà déclenchait un 2e Job concurrent : les deux bouclaient sur les
        // mêmes lots → convocations dupliquées tant que l'un des deux n'avait
        // pas fini sa purge. On ignore le re-déclenchement tant que c'est "pending".
        if ($assemblee->convocations_status === 'pending') {
            $count = Lot::withoutGlobalScope('tenant')
                ->where('residence_id', $assemblee->residence_id)
                ->count();

            return response()->json([
                'status' => 'success',
                'message' => 'Génération déjà en cours',
                'data' => ['status' => 'accepted', 'count' => $count],
            ], 202);
        }

        // Le job génère une convocation par lot, copro assigné ou non
        // ("Non assigné") : le count annoncé doit refléter ça (pas seulement
        // les lots avec coproprietairePrincipal, sinon "accepted count:0"
        // alors que N convocations seront bien créées).
        $count = Lot::withoutGlobalScope('tenant')
            ->where('residence_id', $assemblee->residence_id)
            ->count();

        // On vide aussi le PDF fusionné/la date de la génération précédente :
        // sinon, pendant que le job tourne (statut "pending"), le GET renvoie
        // encore l'ancien merged_url/generated_at, ce qui laisse croire au
        // frontend qu'une génération (obsolète) est déjà prête.
        $assemblee->update([
            'convocations_status' => 'pending',
            'convocations_merged_path' => null,
            'convocations_generated_at' => null,
        ]);
        GenerateConvocationsJob::dispatch($assemblee->id);

        return response()->json([
            'status' => 'success',
            'message' => 'Génération des convocations lancée',
            'data' => ['status' => 'accepted', 'count' => $count],
        ], 202);
    }

    /**
     * GET /api/gestionnaire/assemblees/{assemblee}/convocations
     * Statut + PDF fusionné (« Imprimer tout ») + liste des convocations individuelles.
     */
    public function convocations(Request $request, Assemblee $assemblee): JsonResponse
    {
        $this->authorizeAssemblee($request, $assemblee);

        $list = Convocation::where('assemblee_id', $assemblee->id)->orderBy('lot_numero')->get()
            ->map(fn (Convocation $c) => [
                'id' => $c->id,
                'coproprietaire_nom' => $c->coproprietaire_nom,
                'lot' => $c->lot_numero,
                'tantieme' => $c->tantieme,
                'url' => Storage::disk('public')->url($c->pdf_path),
            ]);

        return response()->json([
            'status' => 'success',
            'data' => [
                // On ne renvoie "pending" QUE si une génération tourne réellement.
                // Sinon (null = jamais générée, ou "ready"), on renvoie "ready" :
                // le front affiche alors la liste si elle existe, ou l'état vide
                // avec le bouton « Générer ». Mapper null → "pending" bloquait
                // une AG jamais générée sur un spinner infini (bouton masqué).
                'status' => $assemblee->convocations_status === 'pending' ? 'pending' : 'ready',
                'generated_at' => $assemblee->convocations_generated_at?->toIso8601String(),
                'merged_url' => $assemblee->convocations_merged_path
                    ? Storage::disk('public')->url($assemblee->convocations_merged_path)
                    : null,
                'convocations' => $list,
            ],
        ]);
    }

    private function authorizeAssemblee(Request $request, Assemblee $assemblee): void
    {
        abort_unless(
            $assemblee->tenant_id === (int) config('app.tenant_id')
            && $this->accessibleResidenceIds($request)->contains($assemblee->residence_id),
            403,
            'Accès refusé.'
        );
    }
}
