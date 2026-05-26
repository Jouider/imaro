<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('travaux_exceptionnels', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained()->cascadeOnDelete();
            $table->foreignId('residence_id')->constrained()->cascadeOnDelete();
            $table->string('libelle');
            $table->text('description')->nullable();
            $table->date('date_vote_ag');
            $table->foreignId('ag_id')->nullable()->constrained('assemblees')->nullOnDelete();
            $table->string('prestataire')->nullable();
            $table->decimal('montant_vote', 14, 2);
            $table->decimal('montant_engage', 14, 2)->default(0);
            $table->decimal('montant_regle', 14, 2)->default(0);
            $table->date('date_debut')->nullable();
            $table->date('date_fin_prevue')->nullable();
            $table->date('date_fin_reelle')->nullable();
            $table->enum('statut', ['vote', 'en_cours', 'termine', 'annule'])->default('vote');
            $table->timestamps();

            $table->index(['tenant_id', 'residence_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('travaux_exceptionnels');
    }
};
