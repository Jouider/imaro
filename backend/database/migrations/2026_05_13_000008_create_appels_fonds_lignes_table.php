<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('appels_fonds_lignes', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('appel_fonds_id');
            $table->unsignedBigInteger('coproprietaire_id');
            $table->decimal('montant_du', 10, 2);
            $table->decimal('montant_paye', 10, 2)->default(0);
            $table->enum('statut', ['impaye', 'partiel', 'paye'])->default('impaye');
            $table->date('date_paiement')->nullable();
            $table->timestamps();

            $table->foreign('appel_fonds_id')->references('id')->on('appels_fonds')->cascadeOnDelete();
            $table->foreign('coproprietaire_id')->references('id')->on('coproprietaires')->cascadeOnDelete();
            $table->index(['appel_fonds_id', 'statut']);
            $table->index('coproprietaire_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('appels_fonds_lignes');
    }
};
