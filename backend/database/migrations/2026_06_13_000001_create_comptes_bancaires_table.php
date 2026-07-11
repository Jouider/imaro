<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Compte bancaire séparé par syndicat (Art. 26 loi 18-00 — obligatoire).
 * Affiché au résident (RIB/IBAN pour virement) et géré par le gestionnaire.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('comptes_bancaires', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('tenant_id');
            $table->unsignedBigInteger('residence_id');
            $table->string('banque');
            $table->string('titulaire');
            $table->string('rib', 32);            // RIB marocain — 24 chiffres
            $table->string('iban')->nullable();
            $table->boolean('is_primary')->default(false);
            $table->timestamps();
            $table->softDeletes();

            $table->foreign('tenant_id')->references('id')->on('tenants')->cascadeOnDelete();
            $table->foreign('residence_id')->references('id')->on('residences')->cascadeOnDelete();
            $table->index(['tenant_id', 'residence_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('comptes_bancaires');
    }
};
