<?php

namespace App\Http\Controllers\Api\Gestionnaire;

use App\Http\Controllers\Api\Gestionnaire\Concerns\AuthorizesResidence;
use App\Http\Controllers\Controller;
use App\Models\CompteBancaire;
use App\Models\Residence;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * Comptes bancaires d'une résidence (Art. 26 — compte séparé par syndicat).
 * CRUD gestionnaire ; lecture résident via PortailBankAccountController.
 */
class CompteBancaireController extends Controller
{
    use AuthorizesResidence;

    public function index(Request $request, Residence $residence): JsonResponse
    {
        $this->authorizeResidence($request, $residence);

        $comptes = CompteBancaire::where('residence_id', $residence->id)
            ->orderByDesc('is_primary')->orderBy('id')->get();

        return response()->json([
            'status' => 'success',
            'data'   => ['comptes' => $comptes->map(fn ($c) => $this->present($c))->values()],
        ]);
    }

    public function store(Request $request, Residence $residence): JsonResponse
    {
        $this->authorizeResidence($request, $residence);

        $data = $this->validateData($request);

        $compte = DB::transaction(function () use ($residence, $data) {
            $compte = CompteBancaire::create([
                'tenant_id'    => $residence->tenant_id,
                'residence_id' => $residence->id,
                'banque'       => $data['banque'],
                'titulaire'    => $data['titulaire'],
                'rib'          => $data['rib'],
                'iban'         => $data['iban'] ?? null,
                'is_primary'   => $data['is_primary'] ?? false,
            ]);
            $this->normalizePrimary($residence->id, $compte);

            return $compte;
        });

        return response()->json(['status' => 'success', 'message' => 'Compte ajouté.', 'data' => $this->present($compte->fresh())], 201);
    }

    public function update(Request $request, Residence $residence, CompteBancaire $compte): JsonResponse
    {
        $this->authorizeResidence($request, $residence);
        abort_if($compte->residence_id !== $residence->id, 404);

        $data = $this->validateData($request);

        DB::transaction(function () use ($residence, $compte, $data) {
            $compte->update($data);
            $this->normalizePrimary($residence->id, $compte);
        });

        return response()->json(['status' => 'success', 'message' => 'Compte mis à jour.', 'data' => $this->present($compte->fresh())]);
    }

    public function destroy(Request $request, Residence $residence, CompteBancaire $compte): JsonResponse
    {
        $this->authorizeResidence($request, $residence);
        abort_if($compte->residence_id !== $residence->id, 404);

        $compte->delete();

        return response()->json(['status' => 'success', 'message' => 'Compte supprimé.']);
    }

    public function setPrimary(Request $request, Residence $residence, CompteBancaire $compte): JsonResponse
    {
        $this->authorizeResidence($request, $residence);
        abort_if($compte->residence_id !== $residence->id, 404);

        DB::transaction(function () use ($residence, $compte) {
            $compte->update(['is_primary' => true]);
            $this->normalizePrimary($residence->id, $compte);
        });

        return response()->json(['status' => 'success', 'message' => 'Compte défini comme principal.', 'data' => $this->present($compte->fresh())]);
    }

    private function validateData(Request $request): array
    {
        return $request->validate([
            'banque'     => ['required', 'string', 'max:100'],
            'titulaire'  => ['required', 'string', 'max:255'],
            'rib'        => ['required', 'string', 'max:32'],
            'iban'       => ['nullable', 'string', 'max:34'],
            'is_primary' => ['nullable', 'boolean'],
        ]);
    }

    /** Garantit un seul compte principal par résidence. */
    private function normalizePrimary(int $residenceId, CompteBancaire $compte): void
    {
        if ($compte->is_primary) {
            CompteBancaire::where('residence_id', $residenceId)
                ->where('id', '!=', $compte->id)
                ->update(['is_primary' => false]);
        }
    }

    private function present(CompteBancaire $c): array
    {
        return [
            'id'           => $c->id,
            'residence_id' => $c->residence_id,
            'banque'       => $c->banque,
            'titulaire'    => $c->titulaire,
            'rib'          => $c->rib,
            'iban'         => $c->iban,
            'is_primary'   => $c->is_primary,
        ];
    }
}
