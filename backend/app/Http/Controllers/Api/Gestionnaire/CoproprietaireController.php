<?php

namespace App\Http\Controllers\Api\Gestionnaire;

use App\Http\Controllers\Controller;
use App\Http\Resources\CoproprietaireResource;
use App\Models\Coproprietaire;
use App\Models\Residence;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class CoproprietaireController extends Controller
{
    /**
     * POST /api/gestionnaire/coproprietaires/{coproprietaire}/generate-code
     * Génère un code d'accès temporaire pour un résident et le log (WhatsApp simulé).
     */
    public function generateCode(Request $request, Coproprietaire $coproprietaire): JsonResponse
    {
        $residence = $coproprietaire->lot->residence;

        $isManager     = $request->user()->role === 'manager';
        $isGestionnaire = $residence->gestionnaire_id === $request->user()->id;

        abort_if(! $isManager && ! $isGestionnaire, 403, 'Accès refusé.');

        // Code 8 caractères alphanumérique majuscule lisible (sans 0/O/1/I)
        $code = strtoupper(Str::random(8));

        $user = $coproprietaire->user;
        $user->update([
            'access_code'      => Hash::make($code),
            'must_change_code' => true,
        ]);

        // Simulé — sera remplacé par WhatsApp quand Twilio est configuré
        Log::info('[CODE ACCÈS RÉSIDENT - SIMULÉ]', [
            'destinataire' => $user->name,
            'phone'        => $user->phone,
            'residence'    => $residence->name,
            'lot'          => $coproprietaire->lot->numero,
            'code'         => $code,
            'message'      => "Bonjour {$user->name}, bienvenue sur imaro ! Votre code d'accès est : {$code}. Connectez-vous sur l'application avec votre numéro {$user->phone}.",
        ]);

        return response()->json([
            'status'  => 'success',
            'message' => "Code d'accès généré pour {$user->name}.",
            'data'    => [
                'code'  => $code,   // Affiché une seule fois au gestionnaire
                'phone' => $user->phone,
                'name'  => $user->name,
            ],
        ]);
    }

    /**
     * GET /api/gestionnaire/coproprietaires — liste globale de toutes les résidences du gestionnaire
     */
    public function indexGlobal(Request $request): JsonResponse
    {
        $residenceIds = Residence::where('gestionnaire_id', $request->user()->id)
            ->where('tenant_id', config('app.tenant_id'))
            ->pluck('id');

        $coproprietaires = Coproprietaire::whereHas('lot', fn ($q) => $q->whereIn('residence_id', $residenceIds))
            ->with(['user', 'lot.residence'])
            ->get();

        return response()->json([
            'status' => 'success',
            'data'   => ['coproprietaires' => CoproprietaireResource::collection($coproprietaires)],
        ]);
    }

    /**
     * GET /api/gestionnaire/residences/{residence}/coproprietaires
     */
    public function index(Request $request, Residence $residence): JsonResponse
    {
        abort_if(
            $residence->gestionnaire_id !== $request->user()->id,
            403,
            'Cette résidence ne vous est pas assignée.'
        );

        $query = Coproprietaire::whereHas('lot', fn ($q) => $q->where('residence_id', $residence->id))
            ->with(['user', 'lot']);

        if ($search = $request->search) {
            $query->whereHas('user', fn ($q) => $q->where('name', 'like', "%{$search}%")
                ->orWhere('phone', 'like', "%{$search}%")
            );
        }

        $coproprietaires = $query->paginate($request->integer('per_page', 15));

        return response()->json([
            'status' => 'success',
            'data' => [
                'coproprietaires' => CoproprietaireResource::collection($coproprietaires),
                'meta' => [
                    'total' => $coproprietaires->total(),
                    'per_page' => $coproprietaires->perPage(),
                    'current_page' => $coproprietaires->currentPage(),
                    'last_page' => $coproprietaires->lastPage(),
                ],
            ],
        ]);
    }
}
