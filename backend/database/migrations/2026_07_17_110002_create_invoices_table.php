<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Factures d'abonnement des cabinets — back-office Digitoyou (KAN-140).
 * Global (facturation Digitoyou, pas de scope tenant applicatif) mais rattaché
 * au tenant client via tenant_id.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('invoices', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained()->cascadeOnDelete();
            $table->string('numero')->unique();
            $table->unsignedInteger('montant_dh');
            $table->unsignedTinyInteger('remise_pct')->default(0);
            $table->enum('statut', ['envoyee', 'payee', 'impayee', 'annulee'])->default('envoyee');
            $table->string('periode_label')->nullable();
            $table->date('date_emission');
            $table->date('date_echeance');
            $table->date('date_paiement')->nullable();
            $table->timestamps();

            $table->index(['tenant_id', 'statut']);
            $table->index('statut');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('invoices');
    }
};
