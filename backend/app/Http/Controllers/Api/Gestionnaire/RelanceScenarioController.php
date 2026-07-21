<?php

namespace App\Http\Controllers\Api\Gestionnaire;

use App\Http\Controllers\Api\Gestionnaire\Concerns\AuthorizesResidence;
use App\Http\Controllers\Controller;
use App\Models\RelanceScenario;
use App\Models\Residence;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * Scénario de relance de recouvrement par résidence (KAN-87). Le manager
 * configure les étapes (J+X, canal, relance/mise en demeure) ; la commande
 * `relances:run` les exécute.
 */
class RelanceScenarioController extends Controller
{
    use AuthorizesResidence;

    public function show(Request $request, Residence $residence): JsonResponse
    {
        $this->authorizeResidence($request, $residence);

        $scenario = RelanceScenario::with('steps')->firstWhere('residence_id', $residence->id);

        return response()->json([
            'status' => 'success',
            'data' => ['scenario' => $this->present($scenario)],
        ]);
    }

    public function update(Request $request, Residence $residence): JsonResponse
    {
        $this->authorizeResidence($request, $residence);

        $data = $request->validate([
            'enabled' => ['required', 'boolean'],
            'steps' => ['present', 'array'],
            'steps.*.delai_jours' => ['required', 'integer', 'min:0', 'max:3650'],
            'steps.*.canal' => ['required', 'in:whatsapp,sms,email'],
            'steps.*.type' => ['required', 'in:relance,mise_en_demeure'],
        ]);

        $scenario = DB::transaction(function () use ($residence, $data) {
            $scenario = RelanceScenario::updateOrCreate(
                ['residence_id' => $residence->id],
                ['tenant_id' => $residence->tenant_id, 'enabled' => $data['enabled']],
            );

            // PUT remplace l'ensemble des étapes (ordre = index du tableau).
            $scenario->steps()->delete();
            foreach (array_values($data['steps']) as $i => $step) {
                $scenario->steps()->create([
                    'ordre' => $i,
                    'delai_jours' => $step['delai_jours'],
                    'canal' => $step['canal'],
                    'type' => $step['type'],
                ]);
            }

            return $scenario;
        });

        return response()->json([
            'status' => 'success',
            'message' => 'Scénario de relance enregistré.',
            'data' => ['scenario' => $this->present($scenario->fresh('steps'))],
        ]);
    }

    private function present(?RelanceScenario $scenario): array
    {
        return [
            'enabled' => (bool) ($scenario?->enabled ?? false),
            'steps' => $scenario
                ? $scenario->steps->map(fn ($s) => [
                    'id' => $s->id,
                    'delai_jours' => $s->delai_jours,
                    'canal' => $s->canal,
                    'type' => $s->type,
                ])->values()
                : [],
        ];
    }
}
