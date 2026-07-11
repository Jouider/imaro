<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('compliance_calendar_tasks', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('residence_id');
            $table->unsignedInteger('exercice');
            $table->enum('phase', ['operations_mensuelles', 'cloture_exercice', 'preparation_ag', 'archivage']);
            $table->string('task_key', 100);
            $table->string('task_label');
            $table->date('due_date')->nullable();
            $table->enum('status', ['pending', 'in_progress', 'done', 'skipped', 'overdue'])->default('pending');
            $table->timestamp('completed_at')->nullable();
            $table->unsignedBigInteger('completed_by')->nullable();
            $table->timestamps();

            $table->unique(['residence_id', 'exercice', 'task_key'], 'unique_task');
            $table->index(['residence_id', 'exercice'], 'idx_residence_exercice');
            $table->index(['status', 'due_date'], 'idx_status');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('compliance_calendar_tasks');
    }
};
