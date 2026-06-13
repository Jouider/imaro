<?php

namespace App\Http\Controllers\Api\Resident;

use App\Http\Controllers\Controller;
use App\Models\Document;
use App\Models\Lot;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PortailDocumentController extends Controller
{
    public function __invoke(Request $request): JsonResponse
    {
        $user = $request->user();
        $residenceId = $this->residentResidenceId($user);

        $documents = Document::where('tenant_id', $user->tenant_id)   // tenant de l'utilisateur (robuste)
            ->where(function ($q) use ($residenceId) {                // docs de sa résidence + globaux
                $q->whereNull('residence_id');
                if ($residenceId) {
                    $q->orWhere('residence_id', $residenceId);
                }
            })
            ->orderByDesc('date')->orderByDesc('created_at')->get()
            ->map(fn ($d) => [
                'id'    => $d->id,
                'titre' => $d->nom,
                'type'  => $d->type,
                'taille' => $d->taille_ko ?? 0,
                'url'   => $d->file_path,
                'date'  => ($d->date ?? $d->created_at)?->toDateString(),
            ]);

        return response()->json(['status' => 'success', 'data' => $documents]);
    }

    private function residentResidenceId(User $user): ?int
    {
        $lotId = $user->coproprietaire?->lot_id;

        return $lotId ? Lot::withoutGlobalScope('tenant')->find($lotId)?->residence_id : null;
    }
}
