<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('depenses', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained()->cascadeOnDelete();
            $table->foreignId('exercice_id')->constrained()->cascadeOnDelete();
            $table->foreignId('residence_id')->constrained()->cascadeOnDelete();
            $table->foreignId('prestataire_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('created_by')->constrained('users')->cascadeOnDelete();
            $table->string('description');
            $table->string('categorie');
            $table->decimal('montant', 12, 2);
            $table->date('date');
            $table->enum('statut', ['paye', 'en_attente', 'annule'])->default('en_attente');
            $table->string('facture_path')->nullable();
            $table->timestamps();

            $table->index(['tenant_id', 'exercice_id']);
            $table->index(['residence_id', 'exercice_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('depenses');
    }
};
