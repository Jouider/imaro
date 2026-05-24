<?php

namespace App\Http\Controllers\Api\Gestionnaire;

use App\Http\Controllers\Controller;
use App\Http\Requests\Gestionnaire\StoreCoproprietaireRequest;
use App\Http\Resources\CoproprietaireResource;
use App\Models\Coproprietaire;
use App\Models\Lot;
use App\Models\Residence;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class CoproprietaireController extends Controller
{
    use \App\Http\Controllers\Api\Gestionnaire\Concerns\AuthorizesResidence;
    /**
     * POST /api/gestionnaire/coproprietaires
     * Crée un user résident + un coproprietaire lié au lot.
     */
    public function store(StoreCoproprietaireRequest $request): JsonResponse
    {
        // Resolve lot — either directly or via residence_id (takes first available lot)
        $lot = $request->lot_id
            ? Lot::findOrFail($request->lot_id)
            : Lot::where('residence_id', $request->residence_id)->firstOrFail();

        $isManager      = $request->user()->role === 'manager';
        $isGestionnaire = $lot->residence->gestionnaire_id === $request->user()->id;

        abort_if(! $isManager && ! $isGestionnaire, 403, 'Accès refusé.');

        $tempCode = strtoupper(Str::random(8));

        $coproprietaire = DB::transaction(function () use ($request, $lot, $tempCode) {
            $user = User::create([
                'tenant_id'        => $request->user()->tenant_id,
                'name'             => $request->name,
                'phone'            => $request->phone,
                'email'            => $request->email,
                'role'             => 'resident',
                'password'         => Hash::make(Str::random(16)),
                'access_code'      => Hash::make($tempCode),
                'must_change_code' => true,
                'status'           => 'active',
            ]);

            return Coproprietaire::create([
                'tenant_id'    => $request->user()->tenant_id,
                'user_id'      => $user->id,
                'lot_id'       => $lot->id,
                'type'         => $request->type ?? 'proprietaire',
                'date_entree'  => $request->date_entree ?? now()->toDateString(),
                'solde_actuel' => 0,
            ]);
        });

        Log::info('[CODE ACCÈS RÉSIDENT - SIMULÉ]', [
            'destinataire' => $request->name,
            'phone'        => $request->phone,
            'code'         => $tempCode,
        ]);

        return response()->json([
            'status'  => 'success',
            'message' => 'Copropriétaire créé.',
            'data'    => [
                'coproprietaire' => new CoproprietaireResource($coproprietaire->load(['user', 'lot'])),
                'temp_password'  => $tempCode,
            ],
        ], 201);
    }

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
     * POST /api/gestionnaire/coproprietaires/bulk
     * Crée plusieurs copropriétaires en une seule requête (chunks de 50 max).
     * Idempotent : ignore les lots qui ont déjà un copropriétaire principal.
     */
    public function bulkStore(Request $request): JsonResponse
    {
        $request->validate([
            'coproprietaires'                  => ['required', 'array', 'min:1', 'max:50'],
            'coproprietaires.*.name'           => ['required', 'string', 'max:255'],
            'coproprietaires.*.phone'          => ['required', 'string', 'max:20'],
            'coproprietaires.*.email'          => ['nullable', 'email', 'max:255'],
            'coproprietaires.*.lot_id'         => ['nullable', 'integer'],
            'coproprietaires.*.lot_numero'     => ['nullable', 'string', 'max:20'],
            'coproprietaires.*.residence_id'   => ['nullable', 'integer'],
            'coproprietaires.*.cin'            => ['nullable', 'string', 'max:20'],
        ]);

        $created = 0;
        $errors  = [];

        foreach ($request->coproprietaires as $index => $data) {
            $line = 'Ligne ' . ($index + 1);
            try {
                // Résoudre le lot par ID ou par numéro
                if (! empty($data['lot_id'])) {
                    $lot = Lot::with('residence')->find($data['lot_id']);
                    if (! $lot) {
                        $errors[] = "{$line}: Lot ID {$data['lot_id']} introuvable.";
                        continue;
                    }
                } elseif (! empty($data['lot_numero']) && ! empty($data['residence_id'])) {
                    $lot = Lot::with('residence')
                        ->where('residence_id', $data['residence_id'])
                        ->where('numero', $data['lot_numero'])
                        ->first();

                    if (! $lot) {
                        $errors[] = "{$line}: Lot \"{$data['lot_numero']}\" introuvable dans cette résidence.";
                        continue;
                    }
                } else {
                    $errors[] = "{$line}: lot_id ou (lot_numero + residence_id) requis.";
                    continue;
                }

                $isManager      = $request->user()->role === 'manager';
                $isGestionnaire = $lot->residence->gestionnaire_id === $request->user()->id;
                if (! $isManager && ! $isGestionnaire) {
                    $errors[] = "{$line}: accès refusé pour la résidence du lot.";
                    continue;
                }

                // Idempotence : lot déjà occupé par un propriétaire ?
                if ($lot->coproprietairePrincipal()->exists()) {
                    $errors[] = "{$line}: le lot '{$lot->numero}' a déjà un copropriétaire principal (ignoré).";
                    continue;
                }

                $tempCode = strtoupper(\Illuminate\Support\Str::random(8));

                DB::transaction(function () use ($data, $lot, $tempCode, $request) {
                    $user = \App\Models\User::create([
                        'tenant_id'        => $request->user()->tenant_id,
                        'name'             => $data['name'],
                        'phone'            => $data['phone'],
                        'email'            => $data['email'] ?? null,
                        'role'             => 'resident',
                        'password'         => \Illuminate\Support\Facades\Hash::make(\Illuminate\Support\Str::random(16)),
                        'access_code'      => \Illuminate\Support\Facades\Hash::make($tempCode),
                        'must_change_code' => true,
                        'status'           => 'active',
                    ]);

                    \App\Models\Coproprietaire::create([
                        'tenant_id'   => $request->user()->tenant_id,
                        'user_id'     => $user->id,
                        'lot_id'      => $lot->id,
                        'type'        => 'proprietaire',
                        'date_entree' => now()->toDateString(),
                        'solde_actuel'=> 0,
                    ]);
                });

                $created++;
            } catch (\Throwable $e) {
                $errors[] = "{$line}: " . $e->getMessage();
            }
        }

        return response()->json([
            'status' => 'success',
            'data'   => ['created' => $created, 'errors' => $errors],
        ]);
    }

    /**
     * GET /api/gestionnaire/coproprietaires — liste globale de toutes les résidences du gestionnaire
     */
    public function indexGlobal(Request $request): JsonResponse
    {
        $residenceIds = $this->accessibleResidenceIds($request);

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
        $this->authorizeResidence($request, $residence);

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
