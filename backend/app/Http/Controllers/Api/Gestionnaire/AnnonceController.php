<?php

namespace App\Http\Controllers\Api\Gestionnaire;

use App\Http\Controllers\Controller;
use App\Http\Resources\AnnonceResource;
use App\Models\Annonce;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
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
            'data'   => ['annonces' => AnnonceResource::collection($annonces)],
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'titre'        => 'required|string|max:255',
            'contenu'      => 'required|string',
            'priorite'     => ['nullable', Rule::in(['normale', 'urgente'])],
            'residence_id' => 'nullable|exists:residences,id',
        ]);

        $annonce = Annonce::create([
            'tenant_id'    => config('app.tenant_id'),
            'created_by'   => $request->user()->id,
            'titre'        => $data['titre'],
            'contenu'      => $data['contenu'],
            'priorite'     => $data['priorite'] ?? 'normale',
            'residence_id' => $data['residence_id'] ?? null,
            'statut'       => 'brouillon',
        ]);

        $annonce->load('residence');

        return response()->json([
            'status'  => 'success',
            'message' => 'Annonce créée',
            'data'    => ['annonce' => new AnnonceResource($annonce)],
        ], 201);
    }

    public function update(Request $request, Annonce $annonce): JsonResponse
    {
        $this->authorizeTenant($annonce);

        $data = $request->validate([
            'titre'        => 'sometimes|string|max:255',
            'contenu'      => 'sometimes|string',
            'priorite'     => ['sometimes', Rule::in(['normale', 'urgente'])],
            'residence_id' => 'nullable|exists:residences,id',
        ]);

        $annonce->update($data);
        $annonce->load('residence');

        return response()->json([
            'status'  => 'success',
            'message' => 'Annonce mise à jour',
            'data'    => ['annonce' => new AnnonceResource($annonce)],
        ]);
    }

    public function publier(Annonce $annonce): JsonResponse
    {
        $this->authorizeTenant($annonce);

        $annonce->update([
            'statut'     => 'publiee',
            'publiee_at' => Carbon::now(),
        ]);

        // Push natif aux résidents (KAN-68) — async, best-effort.
        app(\App\Services\Notifications\PortailPushNotifier::class)->annoncePubliee($annonce);

        $annonce->load('residence');

        return response()->json([
            'status'  => 'success',
            'message' => 'Annonce publiée',
            'data'    => ['annonce' => new AnnonceResource($annonce)],
        ]);
    }

    public function archiver(Annonce $annonce): JsonResponse
    {
        $this->authorizeTenant($annonce);

        $annonce->update(['statut' => 'archivee']);
        $annonce->load('residence');

        return response()->json([
            'status'  => 'success',
            'message' => 'Annonce archivée',
            'data'    => ['annonce' => new AnnonceResource($annonce)],
        ]);
    }

    public function destroy(Annonce $annonce): JsonResponse
    {
        $this->authorizeTenant($annonce);
        $annonce->delete();

        return response()->json(['status' => 'success', 'message' => 'Annonce supprimée']);
    }

    private function authorizeTenant(Annonce $annonce): void
    {
        abort_if($annonce->tenant_id !== config('app.tenant_id'), 403);
    }
}
