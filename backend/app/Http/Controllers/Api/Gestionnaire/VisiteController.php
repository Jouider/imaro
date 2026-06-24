<?php

namespace App\Http\Controllers\Api\Gestionnaire;

use App\Http\Controllers\Api\Gestionnaire\Concerns\AuthorizesResidence;
use App\Http\Controllers\Controller;
use App\Http\Resources\VisiteResource;
use App\Models\Residence;
use App\Models\Visite;
use App\Services\Visites\VisiteService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

/**
 * Visites côté gestionnaire — CRUD + KPIs (cf. brief Visites).
 */
class VisiteController extends Controller
{
    use AuthorizesResidence;

    public function __construct(private readonly VisiteService $service) {}

    /** GET /api/gestionnaire/residences/{residence}/visites */
    public function index(Request $request, Residence $residence): JsonResponse
    {
        $this->authorizeResidence($request, $residence);

        $visites = Visite::with($this->service->eagerLoad())
            ->where('residence_id', $residence->id)
            ->orderByDesc('created_at')
            ->get();

        return response()->json([
            'status' => 'success',
            'data' => VisiteResource::collection($visites),
        ]);
    }

    /** GET /api/gestionnaire/residences/{residence}/visites/stats */
    public function stats(Request $request, Residence $residence): JsonResponse
    {
        $this->authorizeResidence($request, $residence);

        $base = fn () => Visite::where('residence_id', $residence->id);
        $today = now()->toDateString();

        return response()->json([
            'status' => 'success',
            'data' => [
                'today' => $base()->whereDate('created_at', $today)
                    ->orWhere(fn ($q) => $q->where('residence_id', $residence->id)->whereDate('planned_at', $today))
                    ->count(),
                'currently_inside' => $base()->where('status', 'arrived')->count(),
                'planned' => $base()->where('status', 'planned')->where('planned_at', '>', now())->count(),
                'expired_today' => $base()->where('status', 'expired')->where('updated_at', '>=', now()->subDay())->count(),
            ],
        ]);
    }

    /** POST /api/gestionnaire/residences/{residence}/visites */
    public function store(Request $request, Residence $residence): JsonResponse
    {
        $this->authorizeResidence($request, $residence);

        $data = $this->validatePayload($request, $residence);

        $visite = $this->service->create($residence, $data, $request->user());

        return response()->json([
            'status' => 'success',
            'message' => 'Visite créée',
            'data' => new VisiteResource($visite->load($this->service->eagerLoad())),
        ], 201);
    }

    /** POST /api/gestionnaire/visites/{visite}/cancel */
    public function cancel(Request $request, int $visite): JsonResponse
    {
        $v = Visite::findOrFail($visite);

        if (! in_array($v->status, ['planned', 'arrived'], true)) {
            return response()->json([
                'status' => 'error',
                'message' => 'Seule une visite planifiée ou en cours peut être annulée.',
            ], 422);
        }

        $v->update(['status' => 'cancelled']);

        return response()->json([
            'status' => 'success',
            'message' => 'Visite annulée',
            'data' => new VisiteResource($v->load($this->service->eagerLoad())),
        ]);
    }

    private function validatePayload(Request $request, Residence $residence): array
    {
        return $request->validate([
            'visitor_name' => ['required', 'string', 'max:255'],
            'visitor_phone' => ['required', 'string', 'max:20'],
            'type' => ['required', Rule::in(['visitor', 'delivery', 'contractor', 'prestataire'])],
            'purpose' => ['nullable', 'string', 'max:255'],
            'host_lot_id' => ['nullable', Rule::exists('lots', 'id')->where('residence_id', $residence->id)],
            'planned_at' => ['nullable', 'date'],
            'is_recurring' => ['sometimes', 'boolean'],
            'recurrence' => ['nullable', 'string', 'max:255'],
        ]);
    }
}
