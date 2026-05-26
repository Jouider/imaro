<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('equipements', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained()->cascadeOnDelete();
            $table->foreignId('residence_id')->constrained()->cascadeOnDelete();
            $table->string('designation');
            $table->enum('categorie', [
                'ascenseur', 'chauffage', 'climatisation', 'securite',
                'videosurveillance', 'plomberie', 'electricite', 'jardinage', 'autre',
            ]);
            $table->date('date_acquisition');
            $table->decimal('valeur_acquisition', 14, 2);
            $table->unsignedInteger('duree_amortissement_mois');
            $table->decimal('valeur_nette', 14, 2);
            $table->text('notes')->nullable();
            $table->boolean('actif')->default(true);
            $table->timestamps();

            $table->index(['tenant_id', 'residence_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('equipements');
    }
};
