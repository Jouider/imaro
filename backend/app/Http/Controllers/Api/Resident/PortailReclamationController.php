<?php

namespace App\Http\Controllers\Api\Resident;

use App\Http\Controllers\Controller;
use App\Models\Lot;
use App\Models\Ticket;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class PortailReclamationController extends Controller
{
    /** Priorité front (basse/normale/haute/urgente) → enum tickets (faible/normal/urgent). */
    private const PRIORITE_MAP = [
        'basse' => 'faible', 'faible' => 'faible',
        'normale' => 'normal', 'normal' => 'normal',
        'haute' => 'urgent', 'urgente' => 'urgent', 'urgent' => 'urgent',
    ];

    /**
     * Contrat front : { reclamations: Reclamation[] }
     *   Reclamation = { id, reference, categorie, sujet, statut, priorite, created_at, nb_photos }
     */
    public function index(Request $request): JsonResponse
    {
        $tickets = Ticket::where('user_id', $request->user()->id)   // la table tickets utilise user_id
            ->orderByDesc('created_at')->get()
            ->map(function ($t) {
                // sujet = 1re ligne de la description (cf. store qui plie "sujet\n\ndescription")
                $sujet = trim((string) strtok((string) $t->description, "\n"));

                return [
                    'id' => $t->id,
                    // Référence persistée et partagée avec le gestionnaire (KAN-105).
                    'reference' => $t->reference ?? 'TKT-'.($t->created_at?->format('Y') ?? date('Y')).'-'.str_pad((string) $t->id, 3, '0', STR_PAD_LEFT),
                    'categorie' => $t->categorie,
                    'sujet' => $sujet !== '' ? Str::limit($sujet, 80) : (Ticket::CATEGORIE_LABELS[$t->categorie] ?? 'Réclamation'),
                    'statut' => $t->statut,
                    'priorite' => $t->priorite,
                    'created_at' => $t->created_at?->toIso8601String(),
                    'nb_photos' => is_array($t->images) ? count($t->images) : 0,
                ];
            });

        return response()->json(['status' => 'success', 'data' => ['reclamations' => $tickets]]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'titre' => 'nullable|string|max:255',
            'sujet' => 'nullable|string|max:255',
            'description' => 'required|string',
            'categorie' => ['nullable', Rule::in(Ticket::CATEGORIES)],
            'priorite' => 'nullable|string',
        ]);

        $user = $request->user();
        $copro = $user->coproprietaire;
        $lot = $copro?->lot_id ? Lot::withoutGlobalScope('tenant')->find($copro->lot_id) : null;

        // La table tickets n'a pas de "titre" : on plie le sujet dans la description.
        $sujet = $validated['titre'] ?? $validated['sujet'] ?? null;
        $description = $sujet ? ($sujet."\n\n".$validated['description']) : $validated['description'];

        $ticket = Ticket::create([
            'tenant_id' => $user->tenant_id,
            'residence_id' => $lot?->residence_id,
            'user_id' => $user->id,
            'lot_id' => $copro?->lot_id,
            'categorie' => $validated['categorie'] ?? 'autre',
            'description' => $description,
            'priorite' => self::PRIORITE_MAP[$validated['priorite'] ?? 'normal'] ?? 'normal',
            'statut' => 'ouvert',
        ]);

        return response()->json([
            'status' => 'success',
            'message' => 'Réclamation envoyée.',
            'data' => ['id' => $ticket->id],
        ], 201);
    }
}
