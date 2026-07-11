<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * KAN-93 / KAN-108 — catégories de lot par résidence (nom + cotisation), pour le
 * mode de cotisation « par catégorie » : chaque lot d'une catégorie paie sa cotisation.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('categories_lot', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('tenant_id')->index();
            $table->foreignId('residence_id')->constrained()->cascadeOnDelete();
            $table->string('nom');
            $table->decimal('cotisation', 10, 2)->default(0);
            $table->timestamps();

            $table->unique(['residence_id', 'nom']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('categories_lot');
    }
};
