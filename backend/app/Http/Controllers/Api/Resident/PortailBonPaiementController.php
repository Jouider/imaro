<?php

namespace App\Http\Controllers\Api\Resident;

use App\Http\Controllers\Controller;
use App\Http\Resources\BonPaiementResource;
use App\Models\BonPaiement;
use App\Models\Lot;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * Bons de paiement côté résident (KAN-110 / #322).
 * Le résident émet un bon (en_attente, validable 24 h plus tard), consulte
 * son historique et télécharge le PDF une fois le bon validé par le syndic.
 */
class PortailBonPaiementController extends Controller
{
    /** Délai légal minimal avant validation par le syndic. */
    private const DELAI_VALIDATION_HEURES = 24;

    public function index(Request $request): JsonResponse
    {
        $bons = BonPaiement::with('ticket')
            ->where('coproprietaire_id', $this->coproId($request))
            ->orderByDesc('created_at')
            ->get();

        return response()->json([
            'status' => 'success',
            'data' => ['bons' => BonPaiementResource::collection($bons)],
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'compte_emetteur' => 'required|string|max:255',
            'beneficiaire' => 'required|string|max:255',
            'montant' => 'required|numeric|gt:0',
            'motif' => 'required|string|max:2000',
        ]);

        $user = $request->user();
        $copro = $user->coproprietaire;
        abort_unless($copro, 403, 'Aucun copropriétaire associé à ce compte.');
        $lot = $copro->lot_id ? Lot::withoutGlobalScope('tenant')->find($copro->lot_id) : null;

        $bon = BonPaiement::create([
            'tenant_id' => $user->tenant_id,
            'residence_id' => $lot?->residence_id,
            'coproprietaire_id' => $copro->id,
            'compte_emetteur' => $data['compte_emetteur'],
            'beneficiaire' => $data['beneficiaire'],
            'montant' => $data['montant'],
            'motif' => $data['motif'],
            'statut' => 'en_attente',
            'validable_at' => now()->addHours(self::DELAI_VALIDATION_HEURES),
        ]);

        return response()->json([
            'status' => 'success',
            'message' => 'Bon de paiement créé. Il pourra être validé par le syndic après 24 h.',
            'data' => ['bon' => new BonPaiementResource($bon->load('ticket'))],
        ], 201);
    }

    public function show(Request $request, int $id): JsonResponse
    {
        $bon = $this->findOwned($request, $id);

        return response()->json([
            'status' => 'success',
            'data' => ['bon' => new BonPaiementResource($bon)],
        ]);
    }

    public function pdf(Request $request, int $id): StreamedResponse
    {
        $bon = $this->findOwned($request, $id);

        abort_unless($bon->statut === 'valide' && $bon->pdf_path, 404, 'PDF indisponible (bon non encore validé).');
        abort_unless(Storage::disk('public')->exists($bon->pdf_path), 404, 'Fichier PDF introuvable.');

        return Storage::disk('public')->download($bon->pdf_path, "bon-paiement-{$bon->reference}.pdf");
    }

    private function coproId(Request $request): int
    {
        $copro = $request->user()->coproprietaire;
        abort_unless($copro, 403, 'Aucun copropriétaire associé à ce compte.');

        return $copro->id;
    }

    private function findOwned(Request $request, int $id): BonPaiement
    {
        $bon = BonPaiement::with('ticket')->findOrFail($id);
        abort_unless($bon->coproprietaire_id === $this->coproId($request), 403, 'Accès refusé.');

        return $bon;
    }
}
