<?php

namespace App\Http\Controllers\Api\Resident;

use App\Http\Controllers\Controller;
use App\Models\Ticket;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;

class PortailReclamationController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $tickets = Ticket::where('user_id', $request->user()->id)
            ->where('tenant_id', config('app.tenant_id'))
            ->orderByDesc('created_at')
            ->get()
            ->map(fn ($t) => [
                'id'          => $t->id,
                'reference'   => 'REC-'.($t->created_at?->format('Y') ?? date('Y')).'-'.str_pad($t->id, 3, '0', STR_PAD_LEFT),
                'titre'       => $t->description,
                'categorie'   => $t->categorie,
                'description' => $t->description,
                'statut'      => $t->statut,
                'priorite'    => $t->priorite,
                'photos'      => collect($t->images ?? [])->map(fn ($p) => Storage::disk('public')->url($p))->values()->all(),
                'created_at'  => $t->created_at?->toIso8601String(),
            ]);

        return response()->json([
            'status' => 'success',
            'data'   => ['reclamations' => $tickets],
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'titre'       => 'required|string|max:255',
            'description' => 'required|string',
            'categorie'   => ['required', Rule::in(['plomberie', 'electricite', 'ascenseur', 'nettoyage', 'securite', 'autre'])],
            'photos'      => 'nullable|array|max:5',
            'photos.*'    => 'file|image|max:5120',
        ]);

        $user  = $request->user();
        $copro = $user->coproprietaires()->with('lot')->first();

        $imagePaths = [];
        if ($request->hasFile('photos')) {
            foreach ($request->file('photos') as $photo) {
                $imagePaths[] = $photo->store('tickets', 'public');
            }
        }

        $ticket = Ticket::create([
            'tenant_id'    => config('app.tenant_id'),
            'user_id'      => $user->id,
            'lot_id'       => $copro?->lot_id,
            'residence_id' => $copro?->lot?->residence_id,
            'description'  => $request->description,
            'categorie'    => $request->categorie,
            'priorite'     => 'normale',
            'statut'       => 'ouvert',
            'images'       => $imagePaths,
        ]);

        return response()->json([
            'status'  => 'success',
            'message' => 'Réclamation soumise',
            'data'    => [
                'reclamation' => [
                    'id'          => $ticket->id,
                    'reference'   => 'REC-'.date('Y').'-'.str_pad($ticket->id, 3, '0', STR_PAD_LEFT),
                    'categorie'   => $ticket->categorie,
                    'description' => $ticket->description,
                    'statut'      => $ticket->statut,
                    'priorite'    => $ticket->priorite,
                    'photos'      => collect($ticket->images ?? [])->map(fn ($p) => Storage::disk('public')->url($p))->values()->all(),
                    'created_at'  => $ticket->created_at?->toIso8601String(),
                ],
            ],
        ], 201);
    }
}
