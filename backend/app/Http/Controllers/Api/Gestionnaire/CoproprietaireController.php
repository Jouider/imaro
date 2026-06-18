<?php

namespace App\Http\Controllers\Api\Gestionnaire;

use App\Http\Controllers\Controller;
use App\Http\Requests\Gestionnaire\StoreCoproprietaireRequest;
use App\Http\Resources\CoproprietaireResource;
use App\Models\Coproprietaire;
use App\Models\Lot;
use App\Models\Residence;
use App\Models\User;
use App\Services\Notifications\CoproprietaireWelcomeNotifier;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
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

        $tenantId = $request->user()->tenant_id;

        // A copropriétaire can hold several lots (across résidences). Re-use the
        // existing account in this cabinet instead of failing on the unique phone.
        $existing = $this->findResidentInTenant($tenantId, $request->phone, $request->email);

        if (! $existing && $this->identityUsedInOtherTenant($tenantId, $request->phone, $request->email)) {
            return $this->error422('Ce numéro ou email est déjà utilisé par un compte d\'un autre cabinet.', 'phone');
        }

        if ($existing && $existing->role !== 'resident') {
            return $this->error422('Ce numéro ou email appartient à un membre de l\'équipe, pas à un copropriétaire.', 'phone');
        }

        if ($existing && Coproprietaire::where('lot_id', $lot->id)->where('user_id', $existing->id)->exists()) {
            return $this->error422('Ce copropriétaire est déjà rattaché à ce lot.', 'lot_id');
        }

        // Only a freshly created account gets an access code + welcome cascade.
        $tempCode = $existing ? null : strtoupper(Str::random(8));

        $coproprietaire = DB::transaction(function () use ($request, $lot, $tenantId, $existing, $tempCode) {
            if ($existing) {
                if ($existing->trashed()) {
                    $existing->restore();
                }
                $user = $existing;
            } else {
                $user = User::create([
                    'tenant_id'        => $tenantId,
                    'name'             => $request->name,
                    'phone'            => $request->phone,
                    'email'            => $request->email,
                    'role'             => 'resident',
                    'password'         => Hash::make(Str::random(16)),
                    'access_code'      => Hash::make($tempCode),
                    'must_change_code' => true,
                    'status'           => 'active',
                ]);
            }

            // Rôle Spatie obligatoire — sinon le middleware role:resident bloque
            // l'accès au portail (403). La colonne `role` ne suffit pas.
            if (! $user->hasRole('resident')) {
                $user->assignRole('resident');
            }

            return Coproprietaire::create([
                'tenant_id'    => $tenantId,
                'user_id'      => $user->id,
                'lot_id'       => $lot->id,
                'type'         => $request->type ?? 'proprietaire',
                'date_entree'  => $request->date_entree ?? now()->toDateString(),
                'solde_actuel' => 0,
            ]);
        });

        if ($tempCode !== null) {
            app(CoproprietaireWelcomeNotifier::class)
                ->send($coproprietaire->user, $tempCode, $lot->residence);
        }

        return response()->json([
            'status'  => 'success',
            'message' => $existing ? 'Copropriétaire existant rattaché au lot.' : 'Copropriétaire créé.',
            'data'    => [
                'coproprietaire' => new CoproprietaireResource($coproprietaire->load(['user', 'lot'])),
                'temp_password'  => $tempCode,   // null when an existing account was re-used
                'reused'         => (bool) $existing,
            ],
        ], 201);
    }

    /** Existing user (any role, incl. soft-deleted) of this cabinet matching phone or email. */
    private function findResidentInTenant(int $tenantId, ?string $phone, ?string $email): ?User
    {
        return User::withTrashed()
            ->where('tenant_id', $tenantId)
            ->where(function ($q) use ($phone, $email) {
                if ($phone) {
                    $q->orWhere('phone', $phone);
                }
                if ($email) {
                    $q->orWhere('email', $email);
                }
            })
            ->first();
    }

    /** phone/email are globally unique — a match in another cabinet can't be re-used. */
    private function identityUsedInOtherTenant(int $tenantId, ?string $phone, ?string $email): bool
    {
        return User::withTrashed()
            ->where('tenant_id', '!=', $tenantId)
            ->where(function ($q) use ($phone, $email) {
                if ($phone) {
                    $q->orWhere('phone', $phone);
                }
                if ($email) {
                    $q->orWhere('email', $email);
                }
            })
            ->exists();
    }

    private function error422(string $message, string $field): JsonResponse
    {
        return response()->json([
            'status'  => 'error',
            'message' => $message,
            'errors'  => [$field => [$message]],
        ], 422);
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

        app(CoproprietaireWelcomeNotifier::class)->send($user, $code, $residence);

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

                $tenantId = $request->user()->tenant_id;
                $email = $data['email'] ?? null;

                // Re-use an existing copro of this cabinet instead of failing on
                // the unique phone; reject a cross-cabinet collision cleanly.
                $existing = $this->findResidentInTenant($tenantId, $data['phone'], $email);

                if (! $existing && $this->identityUsedInOtherTenant($tenantId, $data['phone'], $email)) {
                    $errors[] = "{$line}: numéro/email déjà utilisé par un autre cabinet (ignoré).";
                    continue;
                }
                if ($existing && $existing->role !== 'resident') {
                    $errors[] = "{$line}: numéro/email d'un membre de l'équipe (ignoré).";
                    continue;
                }

                $tempCode = $existing ? null : strtoupper(Str::random(8));

                $createdUser = DB::transaction(function () use ($data, $lot, $tenantId, $existing, $tempCode, $email) {
                    if ($existing) {
                        if ($existing->trashed()) {
                            $existing->restore();
                        }
                        $user = $existing;
                    } else {
                        $user = User::create([
                            'tenant_id'        => $tenantId,
                            'name'             => $data['name'],
                            'phone'            => $data['phone'],
                            'email'            => $email,
                            'role'             => 'resident',
                            'password'         => Hash::make(Str::random(16)),
                            'access_code'      => Hash::make($tempCode),
                            'must_change_code' => true,
                            'status'           => 'active',
                        ]);
                    }

                    // Rôle Spatie obligatoire (sinon 403 sur le portail résident).
                    if (! $user->hasRole('resident')) {
                        $user->assignRole('resident');
                    }

                    Coproprietaire::create([
                        'tenant_id'   => $tenantId,
                        'user_id'     => $user->id,
                        'lot_id'      => $lot->id,
                        'type'        => 'proprietaire',
                        'date_entree' => now()->toDateString(),
                        'solde_actuel'=> 0,
                    ]);

                    return $user;
                });

                if ($tempCode !== null) {
                    app(CoproprietaireWelcomeNotifier::class)
                        ->send($createdUser, $tempCode, $lot->residence);
                }

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
