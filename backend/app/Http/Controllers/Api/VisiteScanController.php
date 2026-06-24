<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\VisiteResource;
use App\Models\PersonnelResidence;
use App\Models\Residence;
use App\Models\Visite;
use App\Services\Visites\VisiteService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

/**
 * Scan QR + walk-in + liste « à l'intérieur » — flux gardien/personnel
 * (cf. brief Visites). Accessible aux rôles personnel, gestionnaire, manager.
 */
class VisiteScanController extends Controller
{
    public function __construct(private readonly VisiteService $service) {}

    /** Résidences couvertes par l'utilisateur (personnel → ses affectations ; sinon tenant). */
    private function residenceIds(Request $request): array
    {
        $ids = PersonnelResidence::where('user_id', $request->user()->id)
            ->pluck('residence_id')->all();

        return $ids ?: Residence::pluck('id')->all();
    }

    /** POST /api/visites/scan — check-in / check-out / rejected. */
    public function scan(Request $request): JsonResponse
    {
        $data = $request->validate(['token' => ['required', 'string']]);

        $visite = Visite::with($this->service->eagerLoad())
            ->where('qr_token', $data['token'])->first();

        abort_if(! $visite, 404, 'Laissez-passer introuvable.');

        $result = $this->service->scan($visite, $request->user());

        return response()->json([
            'status' => 'success',
            'data' => [
                'visit' => new VisiteResource($visite->fresh($this->service->eagerLoad())),
                'action' => $result['action'],
                'reason' => $result['reason'],
            ],
        ]);
    }

    /** POST /api/visites/walk-in — crée + marque l'arrivée (atomique, idempotent ±5 min). */
    public function walkIn(Request $request): JsonResponse
    {
        $ids = $this->residenceIds($request);

        $data = $request->validate([
            'residence_id' => ['required', 'integer', Rule::in($ids)],
            'visitor_name' => ['required', 'string', 'max:255'],
            'visitor_phone' => ['required', 'string', 'max:20'],
            'type' => ['required', Rule::in(['visitor', 'delivery', 'contractor', 'prestataire'])],
            'purpose' => ['nullable', 'string', 'max:255'],
            'host_lot_id' => ['nullable', 'integer'],
        ]);

        // Idempotence : même visiteur (phone+nom) déjà entré dans les 5 dernières minutes.
        $existing = Visite::where('residence_id', $data['residence_id'])
            ->where('visitor_phone', $data['visitor_phone'])
            ->where('visitor_name', $data['visitor_name'])
            ->where('status', 'arrived')
            ->where('arrived_at', '>=', now()->subMinutes(5))
            ->first();

        if ($existing) {
            return response()->json([
                'status' => 'success',
                'message' => 'Visiteur déjà enregistré récemment.',
                'data' => new VisiteResource($existing->load($this->service->eagerLoad())),
            ]);
        }

        $residence = Residence::findOrFail($data['residence_id']);
        unset($data['planned_at']); // walk-in : arrivée immédiate
        $visite = $this->service->create($residence, $data, $request->user());

        return response()->json([
            'status' => 'success',
            'message' => 'Visiteur enregistré (walk-in).',
            'data' => new VisiteResource($visite->load($this->service->eagerLoad())),
        ], 201);
    }

    /** GET /api/gardien/visites/active — visiteurs actuellement à l'intérieur. */
    public function active(Request $request): JsonResponse
    {
        $visites = Visite::with($this->service->eagerLoad())
            ->whereIn('residence_id', $this->residenceIds($request))
            ->where('status', 'arrived')
            ->orderByDesc('arrived_at')
            ->get();

        return response()->json([
            'status' => 'success',
            'data' => VisiteResource::collection($visites),
        ]);
    }
}
