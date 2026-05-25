<?php

namespace App\Services;

use App\Models\ComplianceCalendarTask;
use Carbon\Carbon;

class ComplianceCalendarService
{
    public function seedForExercice(int $residenceId, int $exercice): void
    {
        $tasks = $this->buildTasks($exercice);

        foreach ($tasks as $task) {
            ComplianceCalendarTask::updateOrCreate(
                [
                    'residence_id' => $residenceId,
                    'exercice' => $exercice,
                    'task_key' => $task['task_key'],
                ],
                [
                    'phase' => $task['phase'],
                    'task_label' => $task['task_label'],
                    'due_date' => $task['due_date'],
                    'status' => 'pending',
                ]
            );
        }
    }

    protected function buildTasks(int $exercice): array
    {
        $tasks = [];
        $months = [
            1 => 'Janvier', 2 => 'Février', 3 => 'Mars', 4 => 'Avril',
            5 => 'Mai', 6 => 'Juin', 7 => 'Juillet', 8 => 'Août',
            9 => 'Septembre', 10 => 'Octobre', 11 => 'Novembre', 12 => 'Décembre',
        ];

        // 12 monthly tasks
        foreach ($months as $month => $label) {
            $tasks[] = [
                'phase' => 'operations_mensuelles',
                'task_key' => "appel_emis_{$month}",
                'task_label' => "Appel de fonds émis {$label}",
                'due_date' => Carbon::create($exercice, $month)->endOfMonth()->toDateString(),
            ];
        }

        // Cloture exercice tasks (for exercice N, due in N+1)
        $tasks[] = [
            'phase' => 'cloture_exercice',
            'task_key' => "arret_comptes_{$exercice}",
            'task_label' => "Arrêt des comptes {$exercice}",
            'due_date' => Carbon::create($exercice + 1, 3, 31)->toDateString(),
        ];
        $tasks[] = [
            'phase' => 'cloture_exercice',
            'task_key' => "audit_interne_{$exercice}",
            'task_label' => 'Audit interne',
            'due_date' => Carbon::create($exercice + 1, 4, 30)->toDateString(),
        ];
        $tasks[] = [
            'phase' => 'cloture_exercice',
            'task_key' => 'provisions_creances',
            'task_label' => 'Provisions créances douteuses',
            'due_date' => Carbon::create($exercice + 1, 4, 30)->toDateString(),
        ];

        // AG preparation tasks (estimated June N+1)
        $agDate = Carbon::create($exercice + 1, 6, 15);
        $tasks[] = [
            'phase' => 'preparation_ag',
            'task_key' => 'convocation_envoyee',
            'task_label' => 'Convocations AG envoyées',
            'due_date' => $agDate->copy()->subDays(15)->toDateString(),
        ];
        $tasks[] = [
            'phase' => 'preparation_ag',
            'task_key' => 'documents_disposition',
            'task_label' => 'Documents à disposition',
            'due_date' => $agDate->copy()->subDays(15)->toDateString(),
        ];
        $tasks[] = [
            'phase' => 'preparation_ag',
            'task_key' => 'tenue_ag',
            'task_label' => "Tenue de l'AG",
            'due_date' => $agDate->toDateString(),
        ];

        // Archivage tasks
        $tasks[] = [
            'phase' => 'archivage',
            'task_key' => 'pv_signe',
            'task_label' => "PV de l'AG signé",
            'due_date' => $agDate->copy()->addMonth()->toDateString(),
        ];
        $tasks[] = [
            'phase' => 'archivage',
            'task_key' => 'annexes_generees',
            'task_label' => 'Annexes 10, 13-1, 13-2 générées',
            'due_date' => $agDate->copy()->addMonth()->toDateString(),
        ];
        $tasks[] = [
            'phase' => 'archivage',
            'task_key' => 'archivage_complet',
            'task_label' => 'Archivage exercice clôturé',
            'due_date' => $agDate->copy()->addMonths(2)->toDateString(),
        ];

        return $tasks;
    }
}
