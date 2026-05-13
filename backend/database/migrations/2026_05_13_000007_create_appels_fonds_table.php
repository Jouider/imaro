<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('appels_fonds', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('tenant_id');
            $table->unsignedBigInteger('residence_id');
            $table->unsignedBigInteger('created_by');
            $table->string('libelle');
            $table->text('description')->nullable();
            $table->decimal('montant_total', 10, 2);
            $table->date('date_echeance');
            $table->enum('statut', ['brouillon', 'envoye', 'partiel', 'solde'])
                ->default('brouillon');
            $table->timestamp('sent_at')->nullable();
            $table->timestamps();

            $table->foreign('tenant_id')->references('id')->on('tenants')->cascadeOnDelete();
            $table->foreign('residence_id')->references('id')->on('residences')->cascadeOnDelete();
            $table->foreign('created_by')->references('id')->on('users');
            $table->index(['tenant_id', 'statut']);
            $table->index(['residence_id', 'date_echeance']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('appels_fonds');
    }
};
