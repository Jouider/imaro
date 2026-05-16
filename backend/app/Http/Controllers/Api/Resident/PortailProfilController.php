<?php

namespace App\Http\Controllers\Api\Resident;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PortailProfilController extends Controller
{
    public function show(Request $request): JsonResponse
    {
        $user  = $request->user();
        $copro = $user->coproprietaires()->with('lot.residence')->first();

        return response()->json([
            'status' => 'success',
            'data'   => [
                'user' => [
                    'id'        => $user->id,
                    'name'      => $user->name,
                    'email'     => $user->email,
                    'phone'     => $user->phone,
                    'lot'       => $copro?->lot ? [
                        'id'        => $copro->lot->id,
                        'numero'    => $copro->lot->numero,
                        'type'      => $copro->lot->type,
                        'etage'     => $copro->lot->etage,
                        'superficie'=> $copro->lot->superficie,
                    ] : null,
                    'residence' => $copro?->lot?->residence ? [
                        'id'     => $copro->lot->residence->id,
                        'name'   => $copro->lot->residence->name,
                        'adresse'=> $copro->lot->residence->address,
                    ] : null,
                ],
            ],
        ]);
    }

    public function update(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name'  => 'sometimes|string|max:255',
            'email' => 'nullable|email|max:255',
        ]);

        $request->user()->update($data);

        return $this->show($request);
    }
}
