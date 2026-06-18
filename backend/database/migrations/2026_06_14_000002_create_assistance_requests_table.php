<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * #179 — demandes d'« Assistance recouvrement » (service optionnel payant).
 * Persiste chaque demande pour un suivi structuré + déclenche un email à l'équipe IT.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('assistance_requests', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('tenant_id')->nullable();
            $table->string('reference')->unique();           // ex. AR-7F3K9Q
            $table->string('contact_name');
            $table->string('contact_phone');
            $table->string('contact_email');
            $table->string('syndic_name');
            $table->string('residences_count')->nullable();
            $table->string('impayes_estimate')->nullable();
            $table->enum('plan', ['essentiel', 'complet', 'sur_mesure']);
            $table->text('message')->nullable();
            $table->enum('statut', ['nouvelle', 'en_cours', 'traitee', 'cloturee'])->default('nouvelle');
            $table->unsignedBigInteger('created_by')->nullable();
            $table->timestamps();

            $table->index(['tenant_id', 'statut']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('assistance_requests');
    }
};
