<?php

namespace App\Http\Controllers\Api\Gestionnaire;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class VirementDeclareController extends Controller
{
    /**
     * GET /api/gestionnaire/virements-declares
     */
    public function index(): JsonResponse
    {
        return response()->json([
            'status' => 'success',
            'data'   => [],
        ]);
    }

    /**
     * POST /api/gestionnaire/virements-declares/{id}/valider
     */
    public function valider(int $id): JsonResponse
    {
        return response()->json([
            'status'  => 'success',
            'message' => 'Virement validé.',
            'data'    => null,
        ]);
    }

    /**
     * POST /api/gestionnaire/virements-declares/{id}/rejeter
     */
    public function rejeter(Request $request, int $id): JsonResponse
    {
        return response()->json([
            'status'  => 'success',
            'message' => 'Virement rejeté.',
            'data'    => null,
        ]);
    }
}
