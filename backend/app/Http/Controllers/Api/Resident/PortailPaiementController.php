<?php

namespace App\Http\Controllers\Api\Resident;

use App\Http\Controllers\Controller;
use App\Models\VirementDeclare;
use App\Services\Ocr\JustificatifOcrService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

/**
 * Paiements déclarés par le copropriétaire (virement, versement, chèque,
 * espèces). Le résident déclare → statut « en_attente » ; le syndic valide
 * (sans délai imposé) → Paiement réel + reçu PDF, que le résident retrouve
 * ensuite ici (KAN-110 revu).
 */
class PortailPaiementController extends Controller
{
    /**
     * GET /api/portail/paiements
     * Historique des paiements déclarés par le résident (avec reçu si validé).
     */
    public function index(Request $request): JsonResponse
    {
        $copro = $request->user()->coproprietaire;
        abort_if(! $copro, 422, 'Aucun lot n\'est associé à votre compte.');

        $paiements = VirementDeclare::with('paiement')
            ->where('coproprietaire_id', $copro->id)
            ->orderByDesc('date_declaration')
            ->orderByDesc('id')
            ->get()
            ->map(fn (VirementDeclare $v) => $this->present($v));

        return response()->json([
            'status' => 'success',
            'data' => ['paiements' => $paiements],
        ]);
    }

    /**
     * POST /api/portail/paiements
     * Déclaration d'un paiement effectué (avec justificatif). Crée un virement
     * « en_attente » que le syndic valide ensuite.
     */
    public function store(Request $request): JsonResponse
    {
        $copro = $request->user()->coproprietaire;
        abort_if(! $copro, 422, 'Aucun lot n\'est associé à votre compte.');

        $data = $request->validate([
            'montant' => ['required', 'numeric', 'min:1'],
            'date' => ['required', 'date'],
            'methode' => ['required', 'in:virement,versement,cheque,especes'],
            // KAN-83 — référence obligatoire (n° de transaction / bordereau / chèque).
            'reference' => ['required', 'string', 'max:255'],
            'justificatif' => ['nullable', 'file', 'mimes:pdf,jpg,jpeg,png', 'max:5120'],
        ]);

        $path = $request->hasFile('justificatif')
            ? $request->file('justificatif')->store('virements', 'public')
            : null;

        $residence = $copro->lot->residence;

        $virement = VirementDeclare::create([
            'tenant_id' => $residence->tenant_id,
            'residence_id' => $residence->id,
            'coproprietaire_id' => $copro->id,
            'montant' => $data['montant'],
            'date_declaration' => $data['date'],
            'methode' => $data['methode'],
            'reference' => $data['reference'],
            'justificatif_path' => $path,
            'statut' => 'en_attente',
        ]);

        return response()->json([
            'status' => 'success',
            'message' => 'Paiement déclaré. Il sera validé par votre syndic.',
            'data' => ['paiement' => $this->present($virement)],
        ], 201);
    }

    /**
     * POST /api/portail/paiements/ocr
     * Extrait (OCR offline) les champs d'un justificatif importé pour préremplir
     * le formulaire. Best-effort : si l'OCR échoue, renvoie des champs vides
     * (`ocr_ok=false`) et le résident saisit manuellement.
     */
    public function ocr(Request $request, JustificatifOcrService $ocr): JsonResponse
    {
        $request->validate([
            'justificatif' => ['required', 'file', 'mimes:pdf,jpg,jpeg,png,webp', 'max:8192'],
        ]);

        $resultat = $ocr->extraire($request->file('justificatif'));

        return response()->json([
            'status' => 'success',
            'data' => $resultat, // { ocr_ok: bool, champs: { montant, date, methode, reference } }
        ]);
    }

    /** Forme contractuelle d'un paiement déclaré côté résident. */
    private function present(VirementDeclare $v): array
    {
        $recuPath = $v->paiement?->recu_pdf_path;

        return [
            'id' => $v->id,
            'reference' => $v->reference,
            'montant' => round((float) $v->montant, 2),
            'methode' => $v->methode,
            'date' => $v->date_declaration?->toDateString(),
            'statut' => $v->statut,                       // en_attente | valide | rejete
            'validated_at' => $v->date_validation?->toIso8601String(),
            'motif_rejet' => $v->motif_rejet,
            'justificatif_url' => $v->justificatif_path ? Storage::disk('public')->url($v->justificatif_path) : null,
            // « Le bon » = le reçu PDF du paiement, disponible une fois validé.
            'recu_url' => $recuPath ? Storage::disk('public')->url($recuPath) : null,
        ];
    }
}
