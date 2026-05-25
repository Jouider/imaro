<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ComplianceCalendarTask extends Model
{
    protected $table = 'compliance_calendar_tasks';

    protected $fillable = [
        'residence_id', 'exercice', 'phase', 'task_key', 'task_label',
        'due_date', 'status', 'completed_at', 'completed_by',
    ];

    protected function casts(): array
    {
        return [
            'due_date' => 'date',
            'completed_at' => 'datetime',
            'exercice' => 'integer',
        ];
    }

    public function residence(): BelongsTo
    {
        return $this->belongsTo(Residence::class);
    }

    public function completedByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'completed_by');
    }
}
