<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('autres_recettes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained()->cascadeOnDelete();
            $table->foreignId('residence_id')->constrained()->cascadeOnDelete();
            $table->unsignedSmallInteger('exercice');
            $table->date('date');
            $table->string('libelle');
            $table->enum('categorie', [
                'location_parking', 'location_salle', 'location_antenne',
                'subvention', 'indemnite_assurance', 'penalite_retard',
                'produits_financiers', 'autre',
            ]);
            $table->decimal('montant', 14, 2);
            $table->string('payeur')->nullable();
            $table->string('reference')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->index(['tenant_id', 'residence_id', 'exercice']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('autres_recettes');
    }
};
