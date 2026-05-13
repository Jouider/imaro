<?php

namespace App\Http\Controllers\Api\Gestionnaire;

use App\Http\Controllers\Controller;
use App\Http\Resources\CoproprietaireResource;
use App\Models\Coproprietaire;
use App\Models\Residence;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CoproprietaireController extends Controller
{
    /**
     * GET /api/gestionnaire/residences/{residence}/coproprietaires
     */
    public function index(Request $request, Residence $residence): JsonResponse
    {
        abort_if(
            $residence->gestionnaire_id !== $request->user()->id,
            403,
            'Cette résidence ne vous est pas assignée.'
        );

        $query = Coproprietaire::whereHas('lot', fn ($q) => $q->where('residence_id', $residence->id))
            ->with(['user', 'lot']);

        if ($search = $request->search) {
            $query->whereHas('user', fn ($q) => $q->where('name', 'like', "%{$search}%")
                ->orWhere('phone', 'like', "%{$search}%")
            );
        }

        $coproprietaires = $query->paginate($request->integer('per_page', 15));

        return response()->json([
            'status' => 'success',
            'data' => [
                'coproprietaires' => CoproprietaireResource::collection($coproprietaires),
                'meta' => [
                    'total' => $coproprietaires->total(),
                    'per_page' => $coproprietaires->perPage(),
                    'current_page' => $coproprietaires->currentPage(),
                    'last_page' => $coproprietaires->lastPage(),
                ],
            ],
        ]);
    }
}
