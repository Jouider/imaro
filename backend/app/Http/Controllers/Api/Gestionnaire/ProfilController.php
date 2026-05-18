<?php

namespace App\Http\Controllers\Api\Gestionnaire;

use App\Http\Controllers\Controller;
use App\Http\Requests\Gestionnaire\UpdateProfilRequest;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ProfilController extends Controller
{
    public function show(Request $request): JsonResponse
    {
        $user  = $request->user();
        $prefs = $user->notification_prefs ?? [];

        return response()->json([
            'status' => 'success',
            'data'   => [
                'profil' => [
                    'id'               => $user->id,
                    'name'             => $user->name,
                    'phone'            => $user->phone,
                    'email'            => $user->email,
                    'role'             => $user->role,
                    'logo_url'         => $user->avatar ? asset('storage/'.$user->avatar) : null,
                    'notif_paiement'   => $prefs['paiement'] ?? true,
                    'notif_ticket'     => $prefs['ticket'] ?? true,
                    'notif_assemblee'  => $prefs['assemblee'] ?? true,
                    'notif_retard'     => $prefs['retard'] ?? true,
                ],
            ],
        ]);
    }

    public function update(UpdateProfilRequest $request): JsonResponse
    {
        $user = $request->user();

        if ($request->has('name')) {
            $user->name = $request->name;
        }

        $prefKeys = ['notif_paiement', 'notif_ticket', 'notif_assemblee', 'notif_retard'];
        $prefs    = $user->notification_prefs ?? [];

        foreach ($prefKeys as $key) {
            if ($request->has($key)) {
                $prefs[str_replace('notif_', '', $key)] = $request->boolean($key);
            }
        }

        $user->notification_prefs = $prefs;
        $user->save();

        return response()->json([
            'status'  => 'success',
            'message' => 'Profil mis à jour.',
            'data'    => [
                'profil' => [
                    'id'               => $user->id,
                    'name'             => $user->name,
                    'phone'            => $user->phone,
                    'email'            => $user->email,
                    'role'             => $user->role,
                    'logo_url'         => $user->avatar ? asset('storage/'.$user->avatar) : null,
                    'notif_paiement'   => $prefs['paiement'] ?? true,
                    'notif_ticket'     => $prefs['ticket'] ?? true,
                    'notif_assemblee'  => $prefs['assemblee'] ?? true,
                    'notif_retard'     => $prefs['retard'] ?? true,
                ],
            ],
        ]);
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
            'data'   => ['logo_url' => asset('storage/'.$path)],
        ]);
    }
}
