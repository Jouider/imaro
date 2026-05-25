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

        // Required annexes depend on regime
        $requises = ['10', '13-1', '13-2'];
        $disponibles = $cached->keys()->toArray();

        return response()->json([
            'status' => 'success',
            'data' => [
                'requises' => $requises,
                'disponibles' => $disponibles,
                'annexes' => $cached->map(fn ($c) => [
                    'num' => $c->annexe_num,
                    'generated_at' => $c->generated_at?->toISOString(),
                    'pdf_url' => $c->pdf_path,
                ]),
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
