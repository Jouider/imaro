<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Virement/paiement déclaré par un copropriétaire depuis le portail (avec
 * justificatif), en attente de validation par le gestionnaire. À la validation,
 * un vrai Paiement est créé et le virement passe « valide ».
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('virements_declares', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('tenant_id');
            $table->unsignedBigInteger('residence_id');
            $table->unsignedBigInteger('coproprietaire_id');
            $table->decimal('montant', 10, 2);
            $table->date('date_declaration');
            $table->enum('methode', ['virement', 'versement', 'cheque', 'especes'])->default('virement');
            $table->string('reference')->nullable();
            $table->string('justificatif_path')->nullable();
            $table->enum('statut', ['en_attente', 'valide', 'rejete'])->default('en_attente');
            $table->text('motif_rejet')->nullable();
            $table->unsignedBigInteger('valide_par')->nullable();
            $table->timestamp('date_validation')->nullable();
            $table->unsignedBigInteger('paiement_id')->nullable();
            $table->timestamps();

            $table->foreign('tenant_id')->references('id')->on('tenants')->cascadeOnDelete();
            $table->foreign('residence_id')->references('id')->on('residences')->cascadeOnDelete();
            $table->foreign('coproprietaire_id')->references('id')->on('coproprietaires')->cascadeOnDelete();
            $table->foreign('valide_par')->references('id')->on('users')->nullOnDelete();
            $table->foreign('paiement_id')->references('id')->on('paiements')->nullOnDelete();
            $table->index(['tenant_id', 'residence_id', 'statut']);
            $table->index('coproprietaire_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('virements_declares');
    }
};
