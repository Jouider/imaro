<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('pointage_line_matches', function (Blueprint $table) {
            $table->id();
            $table->foreignId('session_id')->constrained('pointage_sessions')->cascadeOnDelete();
            $table->string('bank_line_hash');
            $table->string('target_type'); // 'paiement' or 'depense'
            $table->unsignedBigInteger('target_id');
            $table->timestamp('confirmed_at')->nullable();
            $table->foreignId('confirmed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->unique(['session_id', 'bank_line_hash']);
            $table->index(['target_type', 'target_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('pointage_line_matches');
    }
};
