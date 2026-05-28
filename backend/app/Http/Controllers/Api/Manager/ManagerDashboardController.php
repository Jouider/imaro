<?php

namespace App\Http\Controllers\Api\Manager;

use App\Http\Controllers\Controller;
use App\Models\Residence;
use App\Models\User;
use App\Models\Paiement;
use App\Models\Depense;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ManagerDashboardController extends Controller
{
    public function __invoke(Request $request): JsonResponse
    {
        $tenantId = config('app.tenant_id');

        $nbResidences = Residence::where('tenant_id', $tenantId)->count();
        $nbGestionnaires = User::where('tenant_id', $tenantId)
            ->whereHas('roles', fn ($q) => $q->where('name', 'gestionnaire'))->count();
        $totalEncaissements = Paiement::where('tenant_id', $tenantId)->sum('montant');
        $totalDepenses = Depense::where('tenant_id', $tenantId)
            ->where('statut', '!=', 'annule')->sum('montant');

        return response()->json([
            'status' => 'success',
            'data'   => [
                'nb_residences'       => $nbResidences,
                'nb_gestionnaires'    => $nbGestionnaires,
                'total_encaissements' => round((float) $totalEncaissements, 2),
                'total_depenses'      => round((float) $totalDepenses, 2),
                'solde'               => round((float) ($totalEncaissements - $totalDepenses), 2),
            ],
        ]);
    }
}
