<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('contrats', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('tenant_id');
            $table->unsignedBigInteger('residence_id');
            $table->unsignedBigInteger('prestataire_id');
            $table->string('titre');
            $table->enum('type', ['maintenance', 'nettoyage', 'gardiennage', 'ascenseur', 'autre'])->default('autre');
            $table->decimal('montant', 10, 2);
            $table->date('date_debut');
            $table->date('date_fin');
            $table->enum('statut', ['actif', 'expire', 'resilie'])->default('actif');
            $table->timestamps();

            $table->foreign('tenant_id')->references('id')->on('tenants')->cascadeOnDelete();
            $table->foreign('residence_id')->references('id')->on('residences')->cascadeOnDelete();
            $table->foreign('prestataire_id')->references('id')->on('prestataires')->cascadeOnDelete();
            $table->index(['tenant_id', 'statut']);
            $table->index(['residence_id', 'statut']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('contrats');
    }
};
