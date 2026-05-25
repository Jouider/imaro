<?php

namespace App\Http\Controllers\Api\Gestionnaire;

use App\Http\Controllers\Api\Gestionnaire\Concerns\AuthorizesResidence;
use App\Http\Controllers\Controller;
use App\Models\ComplianceCalendarTask;
use App\Models\Residence;
use App\Services\ComplianceCalendarService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ComplianceCalendarController extends Controller
{
    use AuthorizesResidence;

    public function index(Request $request, Residence $residence): JsonResponse
    {
        $this->authorizeResidence($request, $residence);

        $exercice = $request->integer('exercice', (int) date('Y'));

        // Auto-seed if no tasks exist for this exercice
        $tasks = ComplianceCalendarTask::where('residence_id', $residence->id)
            ->where('exercice', $exercice)
            ->get();

        if ($tasks->isEmpty()) {
            (new ComplianceCalendarService())->seedForExercice($residence->id, $exercice);
            $tasks = ComplianceCalendarTask::where('residence_id', $residence->id)
                ->where('exercice', $exercice)
                ->get();
        }

        // Mark overdue tasks
        $today = now()->toDateString();
        ComplianceCalendarTask::where('residence_id', $residence->id)
            ->where('exercice', $exercice)
            ->where('status', 'pending')
            ->whereNotNull('due_date')
            ->where('due_date', '<', $today)
            ->update(['status' => 'overdue']);

        // Re-fetch after update
        $tasks = ComplianceCalendarTask::where('residence_id', $residence->id)
            ->where('exercice', $exercice)
            ->orderBy('due_date')
            ->get();

        // Calculate regime
        $totalRecettes = DB::table('appels_fonds_lignes')
            ->join('appels_fonds', 'appels_fonds.id', '=', 'appels_fonds_lignes.appel_fonds_id')
            ->join('exercices', 'exercices.id', '=', 'appels_fonds.exercice_id')
            ->where('appels_fonds.residence_id', $residence->id)
            ->where('exercices.annee', $exercice)
            ->sum('appels_fonds_lignes.montant_du');

        $regime = $totalRecettes <= 200000 ? 'simplifie' : 'normal';

        // Group by phase
        $phases = $tasks->groupBy('phase')->map(function ($phaseTasks, $phaseName) {
            $done = $phaseTasks->whereIn('status', ['done', 'skipped'])->count();
            $total = $phaseTasks->count();
            return [
                'phase' => $phaseName,
                'progress_pct' => $total > 0 ? round(($done / $total) * 100) : 0,
                'tasks' => $phaseTasks->values(),
            ];
        })->values();

        $totalDone = $tasks->whereIn('status', ['done', 'skipped'])->count();
        $progressPct = $tasks->count() > 0 ? round(($totalDone / $tasks->count()) * 100) : 0;

        return response()->json([
            'status' => 'success',
            'data' => [
                'exercice' => $exercice,
                'regime' => $regime,
                'seuil_recettes' => round($totalRecettes, 2),
                'progression_pct' => $progressPct,
                'phases' => $phases,
            ],
        ]);
    }

    public function complete(Request $request, ComplianceCalendarTask $task): JsonResponse
    {
        $task->update([
            'status' => 'done',
            'completed_at' => now(),
            'completed_by' => auth()->id(),
        ]);

        return response()->json([
            'status' => 'success',
            'data' => ['task' => $task->fresh()],
        ]);
    }

    public function skip(Request $request, ComplianceCalendarTask $task): JsonResponse
    {
        $request->validate([
            'reason' => ['nullable', 'string', 'max:500'],
        ]);

        $task->update([
            'status' => 'skipped',
            'completed_at' => now(),
            'completed_by' => auth()->id(),
        ]);

        return response()->json([
            'status' => 'success',
            'data' => ['task' => $task->fresh()],
        ]);
    }
}
