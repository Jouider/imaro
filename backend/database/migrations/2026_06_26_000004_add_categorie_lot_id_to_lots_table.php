<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * KAN-93 — rattache un lot à une catégorie (mode cotisation « par catégorie »).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('lots', function (Blueprint $table) {
            $table->foreignId('categorie_lot_id')->nullable()->after('immeuble_id')
                ->constrained('categories_lot')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('lots', function (Blueprint $table) {
            $table->dropConstrainedForeignId('categorie_lot_id');
        });
    }
};
