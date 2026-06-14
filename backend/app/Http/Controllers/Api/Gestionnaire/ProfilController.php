<?php

namespace App\Http\Controllers\Api\Gestionnaire;

use App\Http\Controllers\Controller;
use App\Http\Requests\Gestionnaire\UpdateProfilRequest;
use App\Models\CndpConsent;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ProfilController extends Controller
{
    public function show(Request $request): JsonResponse
    {
        return response()->json([
            'status' => 'success',
            'data' => ['profil' => $this->profilData($request->user())],
        ]);
    }

    public function update(UpdateProfilRequest $request): JsonResponse
    {
        $user = $request->user();

        if ($request->has('name')) {
            $user->name = $request->name;
        }

        $prefKeys = ['notif_paiement', 'notif_ticket', 'notif_assemblee', 'notif_retard'];
        $prefs = $user->notification_prefs ?? [];

        foreach ($prefKeys as $key) {
            if ($request->has($key)) {
                $prefs[str_replace('notif_', '', $key)] = $request->boolean($key);
            }
        }

        $user->notification_prefs = $prefs;

        // Consentement CNDP (loi 09-08) — KAN-60 : horodaté + historisé (preuve opposable).
        if ($request->boolean('cndp_consent')) {
            $version = $request->input('cndp_policy_version') ?: config('compliance.cndp_policy_version');
            $user->cndp_consent_at = now();
            $user->cndp_policy_version = $version;

            CndpConsent::create([
                'tenant_id' => $user->tenant_id,
                'user_id' => $user->id,
                'policy_version' => $version,
                'consented_at' => now(),
                'ip' => $request->ip(),
                'user_agent' => substr((string) $request->userAgent(), 0, 512),
            ]);
        }

        $user->save();

        return response()->json([
            'status' => 'success',
            'message' => 'Profil mis à jour.',
            'data' => ['profil' => $this->profilData($user)],
        ]);
    }

    /** Payload profil (partagé show/update). */
    private function profilData(User $user): array
    {
        $prefs = $user->notification_prefs ?? [];

        return [
            'id' => $user->id,
            'name' => $user->name,
            'phone' => $user->phone,
            'email' => $user->email,
            'role' => $user->role,
            'logo_url' => $user->avatar ? asset('storage/'.$user->avatar) : null,
            'notif_paiement' => $prefs['paiement'] ?? true,
            'notif_ticket' => $prefs['ticket'] ?? true,
            'notif_assemblee' => $prefs['assemblee'] ?? true,
            'notif_retard' => $prefs['retard'] ?? true,
            'cndp_consent_at' => $user->cndp_consent_at?->toIso8601String(),
            'cndp_policy_version' => $user->cndp_policy_version,
        ];
    }

    public function uploadLogo(Request $request): JsonResponse
    {
        $request->validate([
            'file' => 'required|image|mimes:png,jpg,jpeg|max:2048',
        ]);

        $user = $request->user();

        if ($user->avatar) {
            \Storage::disk('public')->delete($user->avatar);
        }

        $path = $request->file('file')->store('logos', 'public');
        $user->update(['avatar' => $path]);

        return response()->json([
            'status' => 'success',
            'data' => ['logo_url' => asset('storage/'.$path)],
        ]);
    }
}
