<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Leads / démos du back-office Digitoyou (pipeline commercial). Global (pas de
 * tenant_id) — géré par le super_admin. converted_tenant_id est renseigné à la
 * conversion en client.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('leads', function (Blueprint $table) {
            $table->id();
            $table->string('cabinet_nom');
            $table->string('contact_nom')->nullable();
            $table->string('contact_email')->nullable();
            $table->string('contact_telephone')->nullable();
            $table->string('ville')->nullable();
            $table->enum('source', ['site', 'salon', 'recommandation', 'appel', 'autre'])->default('autre');
            $table->enum('statut', ['nouveau', 'contacte', 'demo_planifiee', 'gagne', 'perdu'])->default('nouveau');
            $table->date('date_demo')->nullable();
            $table->text('notes')->nullable();
            $table->unsignedBigInteger('converted_tenant_id')->nullable();
            $table->timestamps();

            $table->foreign('converted_tenant_id')->references('id')->on('tenants')->nullOnDelete();
            $table->index('statut');
            $table->index('source');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('leads');
    }
};
