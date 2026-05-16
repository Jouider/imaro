<?php

namespace App\Http\Controllers\Api\Gestionnaire;

use App\Http\Controllers\Controller;
use App\Http\Resources\DocumentResource;
use App\Models\Document;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;

class DocumentController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Document::with('residence')
            ->where('tenant_id', config('app.tenant_id'));

        if ($request->filled('type')) {
            $query->where('type', $request->type);
        }

        if ($request->filled('residence_id')) {
            $query->where('residence_id', $request->residence_id);
        }

        $documents = $query->orderByDesc('date')->orderByDesc('created_at')->get();

        return response()->json([
            'status' => 'success',
            'data'   => ['documents' => DocumentResource::collection($documents)],
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'nom'          => 'required|string|max:255',
            'type'         => ['required', Rule::in(['reglement', 'pv_ag', 'contrat', 'facture', 'autre'])],
            'file'         => 'required|file|max:20480|mimes:pdf,jpg,jpeg,png,doc,docx',
            'residence_id' => 'nullable|exists:residences,id',
            'date'         => 'nullable|date',
        ]);

        $file      = $request->file('file');
        $path      = $file->store('documents', 'public');
        $tailleKo  = (int) round($file->getSize() / 1024);

        $document = Document::create([
            'tenant_id'    => config('app.tenant_id'),
            'uploaded_by'  => $request->user()->id,
            'residence_id' => $request->residence_id,
            'nom'          => $request->nom,
            'type'         => $request->type,
            'file_path'    => $path,
            'mime_type'    => $file->getMimeType(),
            'taille_ko'    => $tailleKo,
            'date'         => $request->date,
        ]);

        $document->load('residence');

        return response()->json([
            'status'  => 'success',
            'message' => 'Document ajouté',
            'data'    => ['document' => new DocumentResource($document)],
        ], 201);
    }

    public function destroy(Document $document): JsonResponse
    {
        abort_if($document->tenant_id !== config('app.tenant_id'), 403);

        Storage::disk('public')->delete($document->file_path);
        $document->delete();

        return response()->json(['status' => 'success', 'message' => 'Document supprimé']);
    }
}
