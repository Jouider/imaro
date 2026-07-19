<?php

namespace App\Http\Controllers\Api\Gestionnaire;

use App\Http\Controllers\Api\Gestionnaire\Concerns\AuthorizesResidence;
use App\Http\Controllers\Controller;
use App\Models\Exercice;
use App\Models\Residence;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ExerciceController extends Controller
{
    use AuthorizesResidence;

    public function index(Request $request, Residence $residence): JsonResponse
    {
        $this->authorizeResidence($request, $residence);

        $exercices = $residence->exercices()
            ->orderByDesc('annee')
            ->get()
            ->map(fn ($e) => $this->present($e));

        return response()->json([
            'status' => 'success',
            'data' => $exercices,
        ]);
    }

    public function store(Request $request, Residence $residence): JsonResponse
    {
        $this->authorizeResidence($request, $residence);

        $data = $request->validate([
            'annee' => 'required|integer|min:2000|max:2100',
            // KAN-95 : dates optionnelles → si absentes, fenêtre 12 mois glissants
            // calculée depuis la date d'anniversaire de la résidence (sinon 1er janvier).
            'date_debut' => 'nullable|date',
            'date_fin' => 'nullable|date|after:date_debut',
        ]);

        if ($residence->exercices()->where('annee', $data['annee'])->exists()) {
            return response()->json([
                'status' => 'error',
                'message' => "Un exercice {$data['annee']} existe déjà pour cette résidence.",
            ], 422);
        }

        // Invariant : un seul exercice ACTIF par résidence (KAN-148). On force la
        // clôture de l'exercice courant avant d'en ouvrir un nouveau → transition
        // fiable, et « l'exercice actif » reste résolvable de façon déterministe
        // par tous les modules (comptabilité, budgets, annexes…).
        if ($actif = $residence->exercices()->where('statut', 'actif')->first()) {
            return response()->json([
                'status' => 'error',
                'message' => "L'exercice {$actif->annee} est encore actif. Clôturez-le avant d'en créer un nouveau.",
            ], 422);
        }

        [$debut, $fin] = $residence->exerciceWindow($data['annee']);

        $exercice = $residence->exercices()->create([
            'tenant_id' => $residence->tenant_id,
            'annee' => $data['annee'],
            'date_debut' => $data['date_debut'] ?? $debut,
            'date_fin' => $data['date_fin'] ?? $fin,
            'statut' => 'actif',
        ]);

        return response()->json([
            'status' => 'success',
            'message' => "Exercice {$exercice->annee} créé.",
            'data' => $this->present($exercice),
        ], 201);
    }

    /**
     * Modifie un exercice existant (année et/ou dates) — KAN-148.
     * Débloque la « modification » signalée par le testeur. Un exercice archivé
     * n'est plus modifiable ; un exercice clôturé le reste (corrections de dates).
     */
    public function update(Request $request, Residence $residence, Exercice $exercice): JsonResponse
    {
        $this->authorizeResidence($request, $residence);
        abort_if($exercice->residence_id !== $residence->id, 404);
        abort_if($exercice->statut === 'archive', 422, 'Un exercice archivé ne peut pas être modifié.');

        $data = $request->validate([
            'annee' => 'sometimes|integer|min:2000|max:2100',
            'date_debut' => 'sometimes|date',
            'date_fin' => 'sometimes|date|after:date_debut',
        ]);

        if (isset($data['annee']) && $data['annee'] !== $exercice->annee
            && $residence->exercices()->where('annee', $data['annee'])->where('id', '!=', $exercice->id)->exists()) {
            return response()->json([
                'status' => 'error',
                'message' => "Un exercice {$data['annee']} existe déjà pour cette résidence.",
            ], 422);
        }

        $exercice->update($data);

        return response()->json([
            'status' => 'success',
            'message' => "Exercice {$exercice->annee} mis à jour.",
            'data' => $this->present($exercice->fresh()),
        ]);
    }

    public function cloture(Request $request, Residence $residence, Exercice $exercice): JsonResponse
    {
        $this->authorizeResidence($request, $residence);
        abort_if($exercice->residence_id !== $residence->id, 404);

        if ($exercice->statut !== 'actif') {
            return response()->json([
                'status' => 'error',
                'message' => 'Seul un exercice actif peut être clôturé.',
            ], 422);
        }

        $exercice->update(['statut' => 'cloture']);

        return response()->json([
            'status' => 'success',
            'message' => "Exercice {$exercice->annee} clôturé.",
            'data' => $this->present($exercice),
        ]);
    }

    /**
     * Rouvre un exercice clôturé (cloture → actif) — KAN-148.
     * Interdit s'il existe déjà un autre exercice actif : on préserve l'invariant
     * « un seul actif » (clôturez d'abord l'exercice courant).
     */
    public function reopen(Request $request, Residence $residence, Exercice $exercice): JsonResponse
    {
        $this->authorizeResidence($request, $residence);
        abort_if($exercice->residence_id !== $residence->id, 404);

        if ($exercice->statut !== 'cloture') {
            return response()->json([
                'status' => 'error',
                'message' => 'Seul un exercice clôturé peut être rouvert.',
            ], 422);
        }

        if ($autre = $residence->exercices()->where('statut', 'actif')->where('id', '!=', $exercice->id)->first()) {
            return response()->json([
                'status' => 'error',
                'message' => "L'exercice {$autre->annee} est actif. Clôturez-le avant de rouvrir l'exercice {$exercice->annee}.",
            ], 422);
        }

        $exercice->update(['statut' => 'actif']);

        return response()->json([
            'status' => 'success',
            'message' => "Exercice {$exercice->annee} rouvert.",
            'data' => $this->present($exercice),
        ]);
    }

    private function present(Exercice $e): array
    {
        return [
            'id' => $e->id,
            'residence_id' => $e->residence_id,
            'annee' => $e->annee,
            'statut' => $e->statut,                        // 'actif' | 'cloture' | 'archive'
            'date_debut' => $e->date_debut?->toDateString(),
            'date_fin' => $e->date_fin?->toDateString(),
        ];
    }
}
