<?php

namespace App\Http\Controllers\Api\SuperAdmin;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

/**
 * Sécurité back-office — gestion des membres super_admin Digitoyou (KAN-147).
 *
 * NB (hors périmètre de cette PR, à traiter avec le backend) :
 * - 2FA (TOTP) : nécessite une lib (Fortify ou pragmarx/google2fa) non encore
 *   installée + colonnes `two_factor_*` sur users.
 * - Restriction IP + historique d'impersonation (via le journal d'audit KAN-144).
 */
class SecurityController extends Controller
{
    /** GET /admin/security/members — membres super_admin. */
    public function members(): JsonResponse
    {
        $members = User::where('role', 'super_admin')
            ->orderBy('name')
            ->get()
            ->map(fn (User $u) => [
                'id' => $u->id,
                'name' => $u->name,
                'email' => $u->email,
                'status' => $u->status,
                'last_login_at' => $u->last_login_at?->toIso8601String(),
                'created_at' => $u->created_at?->toIso8601String(),
                'two_factor_enabled' => $u->hasTwoFactorEnabled(), // KAN-147
            ]);

        return response()->json(['status' => 'success', 'data' => $members]);
    }

    /** POST /admin/security/members — inviter un membre (mot de passe temporaire). */
    public function invite(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', Rule::unique('users', 'email')->whereNull('deleted_at')],
        ]);

        $temp = Str::password(14);
        $member = User::create([
            'tenant_id' => $request->user()->tenant_id,
            'name' => $data['name'],
            'email' => $data['email'],
            'role' => 'super_admin',
            'status' => 'active',
            'password' => Hash::make($temp),
        ]);
        $member->assignRole('super_admin');

        return response()->json([
            'status' => 'success',
            'message' => 'Membre invité.',
            'data' => [
                'id' => $member->id,
                'name' => $member->name,
                'email' => $member->email,
                'temp_password' => $temp,
            ],
        ], 201);
    }

    /** DELETE /admin/security/members/{user} — révoquer un membre. */
    public function revoke(Request $request, User $user): JsonResponse
    {
        abort_if($user->role !== 'super_admin', 404, 'Membre introuvable.');
        abort_if($user->id === $request->user()->id, 422, 'Vous ne pouvez pas vous révoquer vous-même.');

        $actifs = User::where('role', 'super_admin')->where('status', 'active')->count();
        abort_if($actifs <= 1, 422, 'Impossible de révoquer le dernier administrateur actif.');

        $user->update(['status' => 'inactive']);
        $user->removeRole('super_admin');
        $user->tokens()->delete();

        return response()->json(['status' => 'success', 'message' => 'Accès révoqué.']);
    }
}
