<?php

namespace App\Http\Controllers\Api\Resident;

use App\Http\Controllers\Controller;
use App\Http\Resources\VisiteResource;
use App\Models\Visite;
use App\Services\Visites\VisiteService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

/**
 * Portail résident — le copropriétaire invite un visiteur et récupère son QR
 * (cf. brief Visites, Phase 3). residence_id / host_lot_id inférés du compte.
 */
class PortailVisiteController extends Controller
{
    public function __construct(private readonly VisiteService $service) {}

    private const MAX_ACTIVE = 10;

    /** GET /api/portail/visites — visites invitées par le résident (récentes d'abord). */
    public function index(Request $request): JsonResponse
    {
        $visites = Visite::with($this->service->eagerLoad())
            ->where('host_user_id', $request->user()->id)
            ->orderByDesc('created_at')
            ->get();

        return response()->json([
            'status' => 'success',
            'data' => VisiteResource::collection($visites),
        ]);
    }

    /** POST /api/portail/visites — invite un visiteur. */
    public function store(Request $request): JsonResponse
    {
        $copro = $request->user()->coproprietaire;
        abort_if(! $copro, 422, 'Aucun lot n\'est associé à votre compte.');

        $lot = $copro->lot;
        $residence = $lot?->residence;
        abort_if(! $residence, 422, 'Résidence introuvable pour votre lot.');

        $data = $request->validate([
            'visitor_name' => ['required', 'string', 'max:255'],
            'visitor_phone' => ['required', 'string', 'max:20'],
            'type' => ['required', Rule::in(['visitor', 'delivery', 'contractor', 'prestataire'])],
            'purpose' => ['nullable', 'string', 'max:255'],
            'planned_at' => ['nullable', 'date'],
        ]);

        $active = Visite::where('host_user_id', $request->user()->id)
            ->whereIn('status', ['planned', 'arrived'])
            ->count();

        if ($active >= self::MAX_ACTIVE) {
            return response()->json([
                'status' => 'error',
                'message' => 'Limite de '.self::MAX_ACTIVE.' visites actives atteinte. Annulez-en une avant d\'en créer une nouvelle.',
            ], 422);
        }

        $data['host_lot_id'] = $lot->id;
        $visite = $this->service->create($residence, $data, $request->user(), $request->user()->id);

        return response()->json([
            'status' => 'success',
            'message' => 'Visiteur invité. Partagez son QR.',
            'data' => new VisiteResource($visite->load($this->service->eagerLoad())),
        ], 201);
    }
}
