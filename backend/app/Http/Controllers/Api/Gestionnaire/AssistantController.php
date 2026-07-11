<?php

namespace App\Http\Controllers\Api\Gestionnaire;

use App\Http\Controllers\Api\Gestionnaire\Concerns\AuthorizesResidence;
use App\Http\Controllers\Controller;
use App\Models\Residence;
use App\Services\Assistant\EmaroAssistantService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Assistant EMARO (KAN-107) — réponses automatiques aux 4 questions clés du syndic.
 */
class AssistantController extends Controller
{
    use AuthorizesResidence;

    public function __construct(private readonly EmaroAssistantService $service) {}

    /**
     * GET /api/gestionnaire/assistant/faq?residence_id=
     * Sans residence_id : réponses génériques. Avec : enrichies (pénalités, prochaine AG).
     */
    public function faq(Request $request): JsonResponse
    {
        $residence = null;

        if ($request->filled('residence_id')) {
            $residence = Residence::findOrFail((int) $request->query('residence_id'));
            $this->authorizeResidence($request, $residence);
        }

        return response()->json([
            'status' => 'success',
            'data' => ['questions' => $this->service->faq($residence)],
        ]);
    }
}
