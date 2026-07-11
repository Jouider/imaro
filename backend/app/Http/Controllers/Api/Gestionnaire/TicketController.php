<?php

namespace App\Http\Controllers\Api\Gestionnaire;

use App\Http\Controllers\Api\Gestionnaire\Concerns\AuthorizesResidence;
use App\Http\Controllers\Controller;
use App\Http\Requests\Gestionnaire\StoreTicketRequest;
use App\Http\Requests\Gestionnaire\UpdateTicketRequest;
use App\Http\Resources\TicketResource;
use App\Models\Notification;
use App\Models\Ticket;
use App\Services\Notifications\PortailPushNotifier;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;

class TicketController extends Controller
{
    use AuthorizesResidence;

    /**
     * GET /api/gestionnaire/tickets
     */
    public function index(Request $request): JsonResponse
    {
        $query = Ticket::with(['residence', 'lot', 'user', 'prestataire', 'assignedTo'])
            ->where('tenant_id', config('app.tenant_id'))
            ->whereHas('residence', $this->residenceScope($request));

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

        // KAN-105 — recherche par référence (le copro cite son code) ou description.
        if ($search = trim((string) $request->query('search'))) {
            $query->where(fn ($q) => $q->where('reference', 'like', "%{$search}%")
                ->orWhere('description', 'like', "%{$search}%"));
        }

        // KAN-88 — inbox : tickets assignés à un gestionnaire (`me` = l'utilisateur courant).
        if ($assignedTo = $request->query('assigned_to')) {
            $query->where('assigned_to', $assignedTo === 'me' ? $request->user()->id : (int) $assignedTo);
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

        if ($request->hasFile('images')) {
            $ticket->update(['images' => $this->uploadImages($request->file('images'), $ticket->id)]);
        }

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

        $ticket->load(['residence', 'lot', 'user', 'prestataire', 'assignedTo']);

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

        // Supprimer des photos existantes
        if (! empty($data['supprimer_images'])) {
            $remaining = collect($ticket->images ?? [])
                ->reject(fn ($path) => in_array($path, $data['supprimer_images']))
                ->values()
                ->all();

            foreach ($data['supprimer_images'] as $path) {
                Storage::disk('public')->delete($path);
            }

            $data['images'] = $remaining;
        }

        // Ajouter de nouvelles photos (cumul avec existantes)
        if ($request->hasFile('images')) {
            $nouvelles = $this->uploadImages($request->file('images'), $ticket->id);
            $data['images'] = array_merge($ticket->images ?? [], $nouvelles);
        }

        unset($data['supprimer_images']);
        $statutChange = array_key_exists('statut', $data) && $data['statut'] !== $ticket->getOriginal('statut');
        $ticket->update($data);
        $ticket->load(['residence', 'lot', 'user', 'prestataire', 'assignedTo']);

        // Push à l'auteur si le statut a changé (KAN-68).
        if ($statutChange) {
            app(PortailPushNotifier::class)->ticketMisAJour($ticket);
        }

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

        app(PortailPushNotifier::class)->ticketMisAJour($ticket);

        return response()->json([
            'status' => 'success',
            'message' => 'Ticket clos',
            'data' => ['ticket' => new TicketResource($ticket->load(['residence', 'lot', 'user']))],
        ]);
    }

    /**
     * PATCH /api/gestionnaire/tickets/{ticket}/assign  (KAN-88)
     * Assigne (ou désassigne avec null) le ticket à un gestionnaire/manager.
     */
    public function assign(Request $request, Ticket $ticket): JsonResponse
    {
        $this->authorizeTicket($request, $ticket);

        $data = $request->validate([
            'gestionnaire_id' => [
                'present', 'nullable', 'integer',
                Rule::exists('users', 'id')
                    ->where('tenant_id', config('app.tenant_id'))
                    ->whereIn('role', ['gestionnaire', 'manager']),
            ],
        ]);

        $ticket->update(['assigned_to' => $data['gestionnaire_id']]);

        // Notifie le gestionnaire nouvellement assigné (inbox).
        if ($data['gestionnaire_id']) {
            Notification::create([
                'tenant_id' => $ticket->tenant_id,
                'user_id' => $data['gestionnaire_id'],
                'type' => 'ticket',
                'title' => 'Ticket assigné',
                'message' => "Le ticket {$ticket->reference} vous a été assigné.",
                'read' => false,
                'data' => ['ticket_id' => $ticket->id, 'reference' => $ticket->reference],
            ]);
        }

        $ticket->load(['residence', 'lot', 'user', 'prestataire', 'assignedTo']);

        return response()->json([
            'status' => 'success',
            'message' => $data['gestionnaire_id'] ? 'Ticket assigné' : 'Ticket désassigné',
            'data' => ['ticket' => new TicketResource($ticket)],
        ]);
    }

    /**
     * Upload les fichiers images et retourne un tableau de chemins relatifs.
     * Stocké dans public/tickets/{ticket_id}/
     */
    private function uploadImages(array $files, int $ticketId): array
    {
        $paths = [];
        foreach ($files as $file) {
            $paths[] = $file->store("tickets/{$ticketId}", 'public');
        }

        return $paths;
    }

    private function authorizeTicket(Request $request, Ticket $ticket): void
    {
        $ticket->loadMissing('residence');
        $this->authorizeResidence($request, $ticket->residence);
    }
}
