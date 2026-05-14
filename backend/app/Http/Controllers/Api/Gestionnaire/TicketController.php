<?php

namespace App\Http\Controllers\Api\Gestionnaire;

use App\Http\Controllers\Controller;
use App\Http\Requests\Gestionnaire\StoreTicketRequest;
use App\Http\Requests\Gestionnaire\UpdateTicketRequest;
use App\Http\Resources\TicketResource;
use App\Models\Ticket;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TicketController extends Controller
{
    /**
     * GET /api/gestionnaire/tickets
     */
    public function index(Request $request): JsonResponse
    {
        $query = Ticket::with(['residence', 'lot', 'user', 'prestataire'])
            ->where('tenant_id', config('app.tenant_id'))
            ->whereHas('residence', fn ($q) => $q->where('gestionnaire_id', $request->user()->id));

        if ($request->filled('residence_id')) {
            $query->where('residence_id', $request->residence_id);
        }

        if ($request->filled('statut')) {
            $query->where('statut', $request->statut);
        }

        if ($request->filled('priorite')) {
            $query->where('priorite', $request->priorite);
        }

        if ($request->filled('categorie')) {
            $query->where('categorie', $request->categorie);
        }

        $tickets = $query->latest()->paginate($request->integer('per_page', 15));

        return response()->json([
            'status' => 'success',
            'data' => [
                'tickets' => TicketResource::collection($tickets),
                'meta' => [
                    'total' => $tickets->total(),
                    'per_page' => $tickets->perPage(),
                    'current_page' => $tickets->currentPage(),
                    'last_page' => $tickets->lastPage(),
                ],
            ],
        ]);
    }

    /**
     * POST /api/gestionnaire/tickets
     */
    public function store(StoreTicketRequest $request): JsonResponse
    {
        $ticket = Ticket::create([
            'tenant_id' => config('app.tenant_id'),
            'residence_id' => $request->residence_id,
            'lot_id' => $request->lot_id,
            'user_id' => $request->user()->id,
            'categorie' => $request->categorie,
            'description' => $request->description,
            'priorite' => $request->priorite,
            'statut' => 'ouvert',
        ]);

        $ticket->load(['residence', 'lot', 'user']);

        return response()->json([
            'status' => 'success',
            'message' => 'Ticket créé',
            'data' => ['ticket' => new TicketResource($ticket)],
        ], 201);
    }

    /**
     * GET /api/gestionnaire/tickets/{ticket}
     */
    public function show(Request $request, Ticket $ticket): JsonResponse
    {
        $this->authorizeTicket($request, $ticket);

        $ticket->load(['residence', 'lot', 'user', 'prestataire']);

        return response()->json([
            'status' => 'success',
            'data' => ['ticket' => new TicketResource($ticket)],
        ]);
    }

    /**
     * PUT /api/gestionnaire/tickets/{ticket}
     */
    public function update(UpdateTicketRequest $request, Ticket $ticket): JsonResponse
    {
        $this->authorizeTicket($request, $ticket);

        $data = $request->validated();

        if (($data['statut'] ?? null) === 'clos' && $ticket->statut !== 'clos') {
            $data['closed_at'] = Carbon::now();
        }

        $ticket->update($data);
        $ticket->load(['residence', 'lot', 'user', 'prestataire']);

        return response()->json([
            'status' => 'success',
            'message' => 'Ticket mis à jour',
            'data' => ['ticket' => new TicketResource($ticket)],
        ]);
    }

    /**
     * POST /api/gestionnaire/tickets/{ticket}/clos
     */
    public function clos(Request $request, Ticket $ticket): JsonResponse
    {
        $this->authorizeTicket($request, $ticket);

        if ($ticket->statut === 'clos') {
            return response()->json([
                'status' => 'error',
                'message' => 'Ce ticket est déjà clos.',
            ], 422);
        }

        $ticket->update([
            'statut' => 'clos',
            'closed_at' => Carbon::now(),
        ]);

        return response()->json([
            'status' => 'success',
            'message' => 'Ticket clos',
            'data' => ['ticket' => new TicketResource($ticket->load(['residence', 'lot', 'user']))],
        ]);
    }

    private function authorizeTicket(Request $request, Ticket $ticket): void
    {
        $ticket->loadMissing('residence');
        abort_if(
            $ticket->residence->gestionnaire_id !== $request->user()->id,
            403,
            'Accès refusé.'
        );
    }
}
