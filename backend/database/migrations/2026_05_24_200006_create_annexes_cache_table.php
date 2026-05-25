<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('annexes_cache', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('residence_id');
            $table->unsignedInteger('exercice');
            $table->string('annexe_num', 10);
            $table->json('data');
            $table->string('pdf_path', 500)->nullable();
            $table->timestamp('generated_at');
            $table->unsignedBigInteger('generated_by');

            $table->unique(['residence_id', 'exercice', 'annexe_num'], 'unique_annexe');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('annexes_cache');
    }
};
