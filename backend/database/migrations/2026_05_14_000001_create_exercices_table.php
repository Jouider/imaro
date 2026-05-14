<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('exercices', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('tenant_id');
            $table->unsignedBigInteger('residence_id');
            $table->unsignedSmallInteger('annee');
            $table->date('date_debut');
            $table->date('date_fin');
            $table->enum('statut', ['actif', 'cloture', 'archive'])->default('actif');
            $table->timestamps();

            $table->foreign('tenant_id')->references('id')->on('tenants')->cascadeOnDelete();
            $table->foreign('residence_id')->references('id')->on('residences')->cascadeOnDelete();
            $table->unique(['residence_id', 'annee']);
            $table->index(['tenant_id', 'statut']);
            $table->index(['residence_id', 'statut']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('exercices');
    }
};
