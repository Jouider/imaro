<?php

namespace App\Http\Controllers\Api\Gestionnaire;

use App\Http\Controllers\Controller;
use App\Http\Requests\Gestionnaire\StoreBilanOuvertureBulkRequest;
use App\Models\BilanOuvertureLigne;
use App\Models\Exercice;
use App\Models\Residence;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class BilanOuvertureController extends Controller
{
    /**
     * GET /api/gestionnaire/residences/{residence}/bilan-ouverture
     */
    public function index(Request $request, Residence $residence): JsonResponse
    {
        $exerciceId = $request->query('exercice_id');

        $query = BilanOuvertureLigne::where('residence_id', $residence->id);

        if ($exerciceId) {
            $query->where('exercice_id', $exerciceId);
        }

        $lignes = $query->orderBy('numero_compte')->get()->map(fn ($l) => [
            'id'             => $l->id,
            'numero_compte'  => $l->numero_compte,
            'libelle'        => $l->libelle,
            'solde_debit'    => round($l->solde_debit, 2),
            'solde_credit'   => round($l->solde_credit, 2),
            'exercice_id'    => $l->exercice_id,
        ]);

        return response()->json([
            'status' => 'success',
            'data'   => ['lignes' => $lignes],
        ]);
    }

    /**
     * POST /api/gestionnaire/residences/{residence}/bilan-ouverture/bulk
     */
    public function bulkStore(StoreBilanOuvertureBulkRequest $request, Residence $residence): JsonResponse
    {
        $exercice = Exercice::where('id', $request->exercice_id)
            ->where('residence_id', $residence->id)
            ->firstOrFail();

        abort_if($exercice->statut === 'cloture', 422, 'Exercice clôturé.');

        $lignes = DB::transaction(function () use ($request, $residence, $exercice) {
            $created = [];

            foreach ($request->lignes as $row) {
                $created[] = BilanOuvertureLigne::updateOrCreate(
                    [
                        'residence_id'  => $residence->id,
                        'exercice_id'   => $exercice->id,
                        'numero_compte' => $row['numero_compte'],
                    ],
                    [
                        'tenant_id'    => $request->user()->tenant_id,
                        'created_by'   => $request->user()->id,
                        'libelle'      => $row['libelle'],
                        'solde_debit'  => $row['solde_debit'] ?? 0,
                        'solde_credit' => $row['solde_credit'] ?? 0,
                    ]
                );
            }

            return $created;
        });

        return response()->json([
            'status'  => 'success',
            'message' => count($lignes) . ' lignes de bilan d\'ouverture importées.',
            'data'    => [
                'lignes' => collect($lignes)->map(fn ($l) => [
                    'id'             => $l->id,
                    'numero_compte'  => $l->numero_compte,
                    'libelle'        => $l->libelle,
                    'solde_debit'    => round($l->solde_debit, 2),
                    'solde_credit'   => round($l->solde_credit, 2),
                    'exercice_id'    => $l->exercice_id,
                ]),
            ],
        ], 201);
    }
}
