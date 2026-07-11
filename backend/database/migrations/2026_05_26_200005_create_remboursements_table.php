<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('remboursements', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained()->cascadeOnDelete();
            $table->foreignId('residence_id')->constrained()->cascadeOnDelete();
            $table->foreignId('coproprietaire_id')->constrained()->cascadeOnDelete();
            $table->string('coproprietaire_nom');
            $table->string('lot_numero')->nullable();
            $table->enum('motif', ['trop_percu', 'erreur_appel', 'indemnite', 'autre']);
            $table->text('description')->nullable();
            $table->decimal('montant', 14, 2);
            $table->date('date_demande');
            $table->date('date_paiement')->nullable();
            $table->enum('mode_paiement', ['virement', 'cheque', 'especes'])->nullable();
            $table->string('reference')->nullable();
            $table->enum('statut', ['demande', 'approuve', 'paye', 'rejete'])->default('demande');
            $table->timestamps();

            $table->index(['tenant_id', 'residence_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('remboursements');
    }
};
