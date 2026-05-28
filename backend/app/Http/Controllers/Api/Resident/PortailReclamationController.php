<?php

namespace App\Http\Controllers\Api\Resident;

use App\Http\Controllers\Controller;
use App\Models\Ticket;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PortailReclamationController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $tickets = Ticket::where('created_by', $request->user()->id)
            ->orderByDesc('created_at')->get()
            ->map(fn ($t) => [
                'id' => $t->id, 'titre' => $t->titre, 'description' => $t->description,
                'categorie' => $t->categorie, 'priorite' => $t->priorite,
                'statut' => $t->statut, 'date' => $t->created_at?->toDateString(),
            ]);

        return response()->json(['status' => 'success', 'data' => $tickets]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'titre' => 'required|string|max:255',
            'description' => 'required|string',
            'categorie' => 'nullable|string',
            'priorite' => 'nullable|in:basse,normale,haute,urgente',
        ]);

        $ticket = Ticket::create([
            'tenant_id' => config('app.tenant_id'),
            'residence_id' => $request->user()->coproprietaire?->lot?->residence_id,
            'created_by' => $request->user()->id,
            'titre' => $validated['titre'],
            'description' => $validated['description'],
            'categorie' => $validated['categorie'] ?? 'autre',
            'priorite' => $validated['priorite'] ?? 'normale',
            'statut' => 'ouvert',
        ]);

        return response()->json(['status' => 'success', 'message' => 'Réclamation envoyée.', 'data' => $ticket], 201);
    }
}
