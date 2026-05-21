<?php

namespace App\Http\Controllers\Api\Resident;

use App\Http\Controllers\Controller;
use App\Models\Document;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class PortailDocumentController extends Controller
{
    public function __invoke(Request $request): JsonResponse
    {
        $user  = $request->user();
        $copro = $user->coproprietaires()->with('lot')->first();

        $residenceId = $copro?->lot?->residence_id;

        $query = Document::where('tenant_id', config('app.tenant_id'));

        if ($residenceId) {
            $query->where(fn ($q) => $q->whereNull('residence_id')->orWhere('residence_id', $residenceId));
        } else {
            $query->whereNull('residence_id');
        }

        $documents = $query->orderByDesc('date')->orderByDesc('created_at')->get()
            ->map(fn ($d) => [
                'id'        => $d->id,
                'nom'       => $d->nom,
                'type'      => $d->type,
                'date'      => $d->date?->toDateString(),
                'taille_ko' => $d->taille_ko,
                'url'       => Storage::disk('public')->url($d->file_path),
            ]);

        return response()->json([
            'status' => 'success',
            'data'   => ['documents' => $documents],
        ]);
    }
}
