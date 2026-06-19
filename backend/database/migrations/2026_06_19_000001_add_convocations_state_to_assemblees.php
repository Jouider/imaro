<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * KAN-98 — état de génération des convocations AG (PDF fusionné « Imprimer tout »).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('assemblees', function (Blueprint $table) {
            $table->string('convocations_status')->nullable();        // pending | ready
            $table->string('convocations_merged_path')->nullable();   // PDF « Imprimer tout »
            $table->timestamp('convocations_generated_at')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('assemblees', function (Blueprint $table) {
            $table->dropColumn(['convocations_status', 'convocations_merged_path', 'convocations_generated_at']);
        });
    }
};
