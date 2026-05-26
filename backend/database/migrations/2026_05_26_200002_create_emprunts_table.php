<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('emprunts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained()->cascadeOnDelete();
            $table->foreignId('residence_id')->constrained()->cascadeOnDelete();
            $table->string('libelle');
            $table->string('organisme');
            $table->date('date_debut');
            $table->date('date_fin');
            $table->decimal('montant_initial', 14, 2);
            $table->decimal('taux_interet', 5, 2);
            $table->unsignedInteger('duree_mois');
            $table->decimal('mensualite', 14, 2);
            $table->decimal('paye_cumule', 14, 2)->default(0);
            $table->decimal('paye_exercice', 14, 2)->default(0);
            $table->decimal('reste', 14, 2);
            $table->enum('statut', ['actif', 'rembourse', 'en_defaut'])->default('actif');
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->index(['tenant_id', 'residence_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('emprunts');
    }
};
