<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('paiements', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('tenant_id');
            $table->unsignedBigInteger('coproprietaire_id');
            $table->unsignedBigInteger('appel_fonds_ligne_id')->nullable();
            $table->unsignedBigInteger('saisi_par');
            $table->decimal('montant', 10, 2);
            $table->enum('mode', ['virement', 'cheque', 'especes', 'mobile'])->default('virement');
            $table->string('reference')->nullable();
            $table->text('note')->nullable();
            $table->string('recu_pdf_path')->nullable();
            $table->date('date_paiement');
            $table->timestamps();

            $table->foreign('tenant_id')->references('id')->on('tenants')->cascadeOnDelete();
            $table->foreign('coproprietaire_id')->references('id')->on('coproprietaires')->cascadeOnDelete();
            $table->foreign('appel_fonds_ligne_id')->references('id')->on('appels_fonds_lignes')->nullOnDelete();
            $table->foreign('saisi_par')->references('id')->on('users');
            $table->index(['tenant_id', 'date_paiement']);
            $table->index('coproprietaire_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('paiements');
    }
};
