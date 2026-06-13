<?php

namespace App\Http\Controllers\Api\Resident;

use App\Http\Controllers\Controller;
use App\Models\Lot;
use App\Models\Ticket;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PortailReclamationController extends Controller
{
    /** Catégorie → libellé affiché (la table tickets n'a pas de colonne titre). */
    private const LABELS = [
        'plomberie' => 'Plomberie', 'electricite' => 'Électricité', 'ascenseur' => 'Ascenseur',
        'proprete' => 'Propreté', 'securite' => 'Sécurité', 'autre' => 'Réclamation',
    ];

    /** Priorité front (basse/normale/haute/urgente) → enum tickets (faible/normal/urgent). */
    private const PRIORITE_MAP = [
        'basse' => 'faible', 'faible' => 'faible',
        'normale' => 'normal', 'normal' => 'normal',
        'haute' => 'urgent', 'urgente' => 'urgent', 'urgent' => 'urgent',
    ];

    public function index(Request $request): JsonResponse
    {
        $tickets = Ticket::where('user_id', $request->user()->id)   // la table tickets utilise user_id
            ->orderByDesc('created_at')->get()
            ->map(fn ($t) => [
                'id'          => $t->id,
                'titre'       => self::LABELS[$t->categorie] ?? 'Réclamation',
                'description' => $t->description,
                'categorie'   => $t->categorie,
                'priorite'    => $t->priorite,
                'statut'      => $t->statut,
                'date'        => $t->created_at?->toDateString(),
            ]);

        return response()->json(['status' => 'success', 'data' => $tickets]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'titre'       => 'nullable|string|max:255',
            'sujet'       => 'nullable|string|max:255',
            'description' => 'required|string',
            'categorie'   => 'nullable|in:plomberie,electricite,ascenseur,proprete,securite,autre',
            'priorite'    => 'nullable|string',
        ]);

        $user = $request->user();
        $copro = $user->coproprietaire;
        $lot = $copro?->lot_id ? Lot::withoutGlobalScope('tenant')->find($copro->lot_id) : null;

        // La table tickets n'a pas de "titre" : on plie le sujet dans la description.
        $sujet = $validated['titre'] ?? $validated['sujet'] ?? null;
        $description = $sujet ? ($sujet."\n\n".$validated['description']) : $validated['description'];

        $ticket = Ticket::create([
            'tenant_id'    => $user->tenant_id,
            'residence_id' => $lot?->residence_id,
            'user_id'      => $user->id,
            'lot_id'       => $copro?->lot_id,
            'categorie'    => $validated['categorie'] ?? 'autre',
            'description'  => $description,
            'priorite'     => self::PRIORITE_MAP[$validated['priorite'] ?? 'normal'] ?? 'normal',
            'statut'       => 'ouvert',
        ]);

        return response()->json([
            'status'  => 'success',
            'message' => 'Réclamation envoyée.',
            'data'    => ['id' => $ticket->id],
        ], 201);
    }
}
