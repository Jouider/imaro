<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * KAN-92 — CIN obligatoire pour le personnel de résidence.
 * Colonne nullable en base (lignes existantes), requise au niveau validation (422).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('personnel_residences', function (Blueprint $table) {
            $table->string('cin', 20)->nullable()->after('phone');
        });
    }

    public function down(): void
    {
        Schema::table('personnel_residences', function (Blueprint $table) {
            $table->dropColumn('cin');
        });
    }
};
