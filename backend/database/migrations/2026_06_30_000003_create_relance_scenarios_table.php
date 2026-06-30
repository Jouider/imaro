<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Scénario de relance de recouvrement par résidence (KAN-87) : étapes ordonnées
 * (J+X après échéance, canal, relance vs mise en demeure). Exécution auto par
 * la commande planifiée `relances:run`.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('relance_scenarios', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('tenant_id');
            $table->unsignedBigInteger('residence_id')->unique();
            $table->boolean('enabled')->default(false);
            $table->timestamps();

            $table->foreign('tenant_id')->references('id')->on('tenants')->cascadeOnDelete();
            $table->foreign('residence_id')->references('id')->on('residences')->cascadeOnDelete();
        });

        Schema::create('relance_scenario_steps', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('relance_scenario_id');
            $table->unsignedInteger('ordre')->default(0);
            $table->unsignedInteger('delai_jours');                       // J+X après l'échéance
            $table->enum('canal', ['whatsapp', 'sms', 'email'])->default('email');
            $table->enum('type', ['relance', 'mise_en_demeure'])->default('relance');
            $table->timestamps();

            $table->foreign('relance_scenario_id')->references('id')->on('relance_scenarios')->cascadeOnDelete();
            $table->index(['relance_scenario_id', 'ordre']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('relance_scenario_steps');
        Schema::dropIfExists('relance_scenarios');
    }
};
