<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * KAN-94 — Titre foncier obligatoire sur les lots.
 * Colonne nullable en base (lignes existantes), requise au niveau validation (422).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('lots', function (Blueprint $table) {
            $table->string('titre_foncier', 100)->nullable()->after('numero');
        });
    }

    public function down(): void
    {
        Schema::table('lots', function (Blueprint $table) {
            $table->dropColumn('titre_foncier');
        });
    }
};
