<?php

namespace App\Http\Controllers\Api\Gestionnaire;

use App\Http\Controllers\Controller;
use App\Models\Equipement;
use App\Models\Residence;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class EquipementController extends Controller
{
    public function index(Request $request, Residence $residence): JsonResponse
    {
        $equipements = Equipement::where('residence_id', $residence->id)
            ->orderByDesc('date_acquisition')
            ->get()
            ->map(fn (Equipement $e) => $this->format($e));

        return response()->json([
            'status' => 'success',
            'data'   => ['equipements' => $equipements],
        ]);
    }

    public function store(Request $request, Residence $residence): JsonResponse
    {
        $data = $request->validate([
            'designation'               => 'required|string|max:255',
            'categorie'                 => 'required|in:ascenseur,chauffage,climatisation,securite,videosurveillance,plomberie,electricite,jardinage,autre',
            'date_acquisition'          => 'required|date',
            'valeur_acquisition'        => 'required|numeric|min:0',
            'duree_amortissement_mois'  => 'required|integer|min:1',
            'notes'                     => 'nullable|string',
            'actif'                     => 'boolean',
        ]);

        $data['tenant_id']    = $request->user()->tenant_id;
        $data['residence_id'] = $residence->id;
        $data['valeur_nette'] = $this->calculerValeurNette(
            $data['valeur_acquisition'],
            $data['date_acquisition'],
            $data['duree_amortissement_mois']
        );

        $equipement = Equipement::create($data);

        return response()->json([
            'status'  => 'success',
            'message' => 'Équipement créé.',
            'data'    => ['equipement' => $this->format($equipement)],
        ], 201);
    }

    public function update(Request $request, Equipement $equipement): JsonResponse
    {
        $data = $request->validate([
            'designation'               => 'sometimes|string|max:255',
            'categorie'                 => 'sometimes|in:ascenseur,chauffage,climatisation,securite,videosurveillance,plomberie,electricite,jardinage,autre',
            'date_acquisition'          => 'sometimes|date',
            'valeur_acquisition'        => 'sometimes|numeric|min:0',
            'duree_amortissement_mois'  => 'sometimes|integer|min:1',
            'notes'                     => 'nullable|string',
            'actif'                     => 'boolean',
        ]);

        $equipement->update($data);

        $equipement->valeur_nette = $this->calculerValeurNette(
            $equipement->valeur_acquisition,
            $equipement->date_acquisition->toDateString(),
            $equipement->duree_amortissement_mois
        );
        $equipement->save();

        return response()->json([
            'status'  => 'success',
            'message' => 'Équipement mis à jour.',
            'data'    => ['equipement' => $this->format($equipement)],
        ]);
    }

    public function destroy(Equipement $equipement): JsonResponse
    {
        $equipement->delete();

        return response()->json(['status' => 'success', 'message' => 'Équipement supprimé.']);
    }

    private function calculerValeurNette(float $valeurAcq, string $dateAcq, int $dureeMois): float
    {
        $moisEcoules = (int) Carbon::parse($dateAcq)->diffInMonths(now());
        $amortissement = ($valeurAcq / $dureeMois) * min($moisEcoules, $dureeMois);

        return round(max(0, $valeurAcq - $amortissement), 2);
    }

    private function format(Equipement $e): array
    {
        return [
            'id'                        => $e->id,
            'residence_id'              => $e->residence_id,
            'designation'               => $e->designation,
            'categorie'                 => $e->categorie,
            'date_acquisition'          => $e->date_acquisition->toDateString(),
            'valeur_acquisition'        => round($e->valeur_acquisition, 2),
            'duree_amortissement_mois'  => $e->duree_amortissement_mois,
            'valeur_nette'              => round($e->valeur_nette, 2),
            'notes'                     => $e->notes,
            'actif'                     => $e->actif,
        ];
    }
}
