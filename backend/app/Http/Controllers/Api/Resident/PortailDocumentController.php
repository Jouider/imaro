<?php

namespace App\Http\Controllers\Api\Resident;

use App\Http\Controllers\Controller;
use App\Models\Document;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PortailDocumentController extends Controller
{
    public function __invoke(Request $request): JsonResponse
    {
        $documents = Document::where('tenant_id', config('app.tenant_id'))
            ->orderByDesc('created_at')->get()
            ->map(fn ($d) => [
                'id' => $d->id, 'titre' => $d->titre ?? $d->nom,
                'type' => $d->type, 'taille' => $d->taille ?? 0,
                'url' => $d->path, 'date' => $d->created_at?->toDateString(),
            ]);

        return response()->json(['status' => 'success', 'data' => $documents]);
    }
}
