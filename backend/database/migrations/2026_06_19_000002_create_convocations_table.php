<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * KAN-98 — convocations AG individuelles (une par copropriétaire), PDF stocké.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('convocations', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('tenant_id')->index();
            $table->foreignId('assemblee_id')->constrained()->cascadeOnDelete();
            $table->unsignedBigInteger('coproprietaire_id')->nullable();
            $table->string('coproprietaire_nom');
            $table->string('lot_numero')->nullable();
            $table->unsignedInteger('tantieme')->default(0);
            $table->string('pdf_path');
            $table->timestamps();

            $table->index('assemblee_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('convocations');
    }
};
