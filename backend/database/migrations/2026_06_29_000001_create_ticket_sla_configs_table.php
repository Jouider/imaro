<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Config SLA des tickets par tenant (KAN-89) : délai max de traitement avant
 * rappel automatique au manager, par niveau de gravité. Valeurs par défaut :
 * urgent 24h, normal 72h, faible 7j (168h).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('ticket_sla_configs', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('tenant_id')->unique();
            $table->boolean('enabled')->default(true);
            $table->unsignedInteger('urgent_hours')->default(24);
            $table->unsignedInteger('normal_hours')->default(72);
            $table->unsignedInteger('faible_hours')->default(168);
            $table->timestamps();

            $table->foreign('tenant_id')->references('id')->on('tenants')->cascadeOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ticket_sla_configs');
    }
};
