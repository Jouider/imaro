<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('penalty_configs', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('residence_id');
            $table->boolean('enabled')->default(false);
            $table->unsignedInteger('grace_period_days')->default(15);
            $table->enum('rate_type', ['fixed', 'percentage', 'daily'])->default('percentage');
            $table->decimal('rate_value', 10, 4)->default(5.0000);
            $table->decimal('cap_max_montant', 10, 2)->nullable();
            $table->date('ag_approved_at')->nullable();
            $table->unsignedBigInteger('ag_id')->nullable();
            $table->timestamps();

            $table->unique('residence_id', 'unique_residence');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('penalty_configs');
    }
};
