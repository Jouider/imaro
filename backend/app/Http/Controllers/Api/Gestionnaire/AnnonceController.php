<?php

namespace App\Http\Controllers\Api\Gestionnaire;

use App\Http\Controllers\Controller;
use App\Http\Resources\AnnonceResource;
use App\Models\Annonce;
use App\Services\Notifications\PortailPushNotifier;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;

class AnnonceController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Annonce::with('residence')
            ->where('tenant_id', config('app.tenant_id'));

        if ($request->filled('statut')) {
            $query->where('statut', $request->statut);
        }

        if ($request->filled('residence_id')) {
            $query->where('residence_id', $request->residence_id);
        }

        $annonces = $query->orderByDesc('created_at')->get();

        return response()->json([
            'status' => 'success',
            'data' => ['annonces' => AnnonceResource::collection($annonces)],
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate(array_merge([
            'titre' => 'required|string|max:255',
            'contenu' => 'required|string',
            'priorite' => ['nullable', Rule::in(['normale', 'urgente'])],
            'residence_id' => 'nullable|exists:residences,id',
        ], $this->mediaRules()));

        $annonce = Annonce::create([
            'tenant_id' => config('app.tenant_id'),
            'created_by' => $request->user()->id,
            'titre' => $data['titre'],
            'contenu' => $data['contenu'],
            'priorite' => $data['priorite'] ?? 'normale',
            'residence_id' => $data['residence_id'] ?? null,
            'statut' => 'brouillon',
        ]);

        if ($request->hasFile('media')) {
            $annonce->update(['media' => $this->uploadMedia($request->file('media'), $annonce->id)]);
        }

        $annonce->load('residence');

        return response()->json([
            'status' => 'success',
            'message' => 'Annonce créée',
            'data' => ['annonce' => new AnnonceResource($annonce)],
        ], 201);
    }

    public function update(Request $request, Annonce $annonce): JsonResponse
    {
        $this->authorizeTenant($annonce);

        $data = $request->validate(array_merge([
            'titre' => 'sometimes|string|max:255',
            'contenu' => 'sometimes|string',
            'priorite' => ['sometimes', Rule::in(['normale', 'urgente'])],
            'residence_id' => 'nullable|exists:residences,id',
            'supprimer_media' => 'sometimes|array',
            'supprimer_media.*' => 'string',
        ], $this->mediaRules()));

        $media = $annonce->media ?? [];

        // Suppression de médias existants (par chemin)
        if (! empty($data['supprimer_media'])) {
            $media = collect($media)->reject(fn ($m) => in_array($m['path'], $data['supprimer_media'], true))->values()->all();
            foreach ($data['supprimer_media'] as $path) {
                Storage::disk('public')->delete($path);
            }
        }

        // Ajout de nouveaux médias (cumul)
        if ($request->hasFile('media')) {
            $media = array_merge($media, $this->uploadMedia($request->file('media'), $annonce->id));
        }

        unset($data['media'], $data['supprimer_media']);
        $data['media'] = $media;

        $annonce->update($data);
        $annonce->load('residence');

        return response()->json([
            'status' => 'success',
            'message' => 'Annonce mise à jour',
            'data' => ['annonce' => new AnnonceResource($annonce)],
        ]);
    }

    public function publier(Annonce $annonce): JsonResponse
    {
        $this->authorizeTenant($annonce);

        $annonce->update([
            'statut' => 'publiee',
            'publiee_at' => Carbon::now(),
        ]);

        // Push natif aux résidents (KAN-68) — async, best-effort.
        app(PortailPushNotifier::class)->annoncePubliee($annonce);

        $annonce->load('residence');

        return response()->json([
            'status' => 'success',
            'message' => 'Annonce publiée',
            'data' => ['annonce' => new AnnonceResource($annonce)],
        ]);
    }

    public function archiver(Annonce $annonce): JsonResponse
    {
        $this->authorizeTenant($annonce);

        $annonce->update(['statut' => 'archivee']);
        $annonce->load('residence');

        return response()->json([
            'status' => 'success',
            'message' => 'Annonce archivée',
            'data' => ['annonce' => new AnnonceResource($annonce)],
        ]);
    }

    public function destroy(Annonce $annonce): JsonResponse
    {
        $this->authorizeTenant($annonce);

        foreach ($annonce->media ?? [] as $m) {
            Storage::disk('public')->delete($m['path']);
        }
        $annonce->delete();

        return response()->json(['status' => 'success', 'message' => 'Annonce supprimée']);
    }

    private function authorizeTenant(Annonce $annonce): void
    {
        abort_if($annonce->tenant_id !== config('app.tenant_id'), 403);
    }

    /**
     * Règles de validation des médias (KAN-96) : images ≤ 5 Mo, vidéos ≤ 30 Mo, max 6.
     */
    private function mediaRules(): array
    {
        return [
            'media' => 'nullable|array|max:6',
            'media.*' => [
                'file',
                'mimetypes:image/jpeg,image/png,image/webp,video/mp4,video/quicktime,video/webm',
                function ($attribute, $file, $fail) {
                    $isVideo = str_starts_with((string) $file->getMimeType(), 'video/');
                    $maxKb = $isVideo ? 30720 : 5120;
                    if ($file->getSize() / 1024 > $maxKb) {
                        $fail($isVideo ? 'Vidéo trop volumineuse (max 30 Mo).' : 'Image trop volumineuse (max 5 Mo).');
                    }
                },
            ],
        ];
    }

    /**
     * Stocke les fichiers sur le disque public et renvoie le tableau media.
     * Disque local pour l'instant — migration object storage prévue (cf. KAN-96).
     */
    private function uploadMedia(array $files, int $annonceId): array
    {
        $media = [];
        foreach ($files as $file) {
            $isVideo = str_starts_with((string) $file->getMimeType(), 'video/');
            $media[] = [
                'type' => $isVideo ? 'video' : 'image',
                'path' => $file->store("annonces/{$annonceId}", 'public'),
                'mime' => $file->getClientMimeType(),
                'taille_ko' => (int) round($file->getSize() / 1024),
            ];
        }

        return $media;
    }
}
