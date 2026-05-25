<?php

namespace App\Http\Controllers\Api\Gestionnaire;

use App\Http\Controllers\Api\Gestionnaire\Concerns\AuthorizesResidence;
use App\Http\Controllers\Controller;
use App\Models\AnnexeCache;
use App\Models\Residence;
use App\Services\AnnexeGeneratorService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AnnexeController extends Controller
{
    use AuthorizesResidence;

    public function index(Request $request, Residence $residence): JsonResponse
    {
        $this->authorizeResidence($request, $residence);

        $exercice = $request->integer('exercice', (int) date('Y'));

        $cached = AnnexeCache::where('residence_id', $residence->id)
            ->where('exercice', $exercice)
            ->get()
            ->keyBy('annexe_num');

        // Determine regime based on annual revenue (Décret 2.23.700)
        $exerciceIds = \App\Models\Exercice::where('residence_id', $residence->id)
            ->where('annee', $exercice)
            ->pluck('id');

        $totalRecettes = \App\Models\Paiement::whereIn('exercice_id', $exerciceIds)
            ->sum('montant');

        $regime = $totalRecettes <= 200000 ? 'simplifie' : 'normal';

        // Simplifié: 10, 13-1, 13-2 required. Normal: all required.
        $requiredNums = $regime === 'simplifie'
            ? ['10', '13-1', '13-2']
            : ['3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13-1', '13-2'];

        // All 12 annexes
        $allNums = ['3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13-1', '13-2'];

        // Supported annexes that can generate real data
        $supported = ['10', '13-1', '13-2'];

        $annexes = collect($allNums)->map(function ($num) use ($cached, $requiredNums, $supported) {
            $c = $cached->get($num);
            return [
                'num' => $num,
                'required' => in_array($num, $requiredNums),
                'available' => in_array($num, $supported),
                'last_generated' => $c?->generated_at?->toISOString(),
            ];
        })->values();

        return response()->json([
            'status' => 'success',
            'data' => [
                'exercice' => $exercice,
                'regime' => $regime,
                'annexes' => $annexes,
            ],
        ]);
    }

    public function show(Request $request, Residence $residence, string $annexeNum): JsonResponse
    {
        $this->authorizeResidence($request, $residence);

        $exercice = $request->integer('exercice', (int) date('Y'));

        $cached = AnnexeCache::where('residence_id', $residence->id)
            ->where('exercice', $exercice)
            ->where('annexe_num', $annexeNum)
            ->first();

        if ($cached) {
            return response()->json([
                'status' => 'success',
                'data' => [
                    'data' => $cached->data,
                    'generated_at' => $cached->generated_at?->toISOString(),
                    'pdf_url' => $cached->pdf_path,
                ],
            ]);
        }

        // Generate on-the-fly
        $service = new AnnexeGeneratorService();
        $data = $service->generate($residence, $exercice, $annexeNum, auth()->id());

        return response()->json([
            'status' => 'success',
            'data' => [
                'data' => $data,
                'generated_at' => now()->toISOString(),
                'pdf_url' => null,
            ],
        ]);
    }

    public function regenerate(Request $request, Residence $residence, string $annexeNum): JsonResponse
    {
        $this->authorizeResidence($request, $residence);

        $exercice = $request->integer('exercice', (int) date('Y'));

        $service = new AnnexeGeneratorService();
        $data = $service->generate($residence, $exercice, $annexeNum, auth()->id());

        $cached = AnnexeCache::where('residence_id', $residence->id)
            ->where('exercice', $exercice)
            ->where('annexe_num', $annexeNum)
            ->first();

        return response()->json([
            'status' => 'success',
            'message' => "Annexe {$annexeNum} régénérée",
            'data' => [
                'data' => $data,
                'pdf_url' => $cached?->pdf_path,
            ],
        ]);
    }
}
