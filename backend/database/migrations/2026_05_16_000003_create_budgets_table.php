<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('budgets', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('tenant_id');
            $table->unsignedBigInteger('residence_id');
            $table->unsignedBigInteger('exercice_id');
            $table->enum('statut', ['brouillon', 'approuve'])->default('brouillon');
            $table->timestamp('approuve_at')->nullable();
            $table->timestamps();

            $table->foreign('tenant_id')->references('id')->on('tenants')->cascadeOnDelete();
            $table->foreign('residence_id')->references('id')->on('residences')->cascadeOnDelete();
            $table->foreign('exercice_id')->references('id')->on('exercices')->cascadeOnDelete();
            $table->unique(['residence_id', 'exercice_id']);
            $table->index('tenant_id');
        });

        Schema::create('postes_budgetaires', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('budget_id');
            $table->enum('categorie', ['entretien', 'gardiennage', 'nettoyage', 'administratif', 'travaux', 'assurance', 'autre']);
            $table->string('description');
            $table->decimal('montant_prevu', 10, 2)->default(0);
            $table->decimal('montant_realise', 10, 2)->default(0);
            $table->timestamps();

            $table->foreign('budget_id')->references('id')->on('budgets')->cascadeOnDelete();
            $table->index('budget_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('postes_budgetaires');
        Schema::dropIfExists('budgets');
    }
};
