<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * KAN-105 — référence unique et lisible par ticket (≥3 chiffres) pour que le
 * copropriétaire puisse retrouver son ticket en citant ce code.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('tickets', function (Blueprint $table) {
            $table->string('reference', 30)->nullable()->after('id');
        });

        // Backfill des tickets existants : TKT-{année}-{id zéro-paddé sur 3}.
        DB::statement("UPDATE tickets SET reference = CONCAT('TKT-', YEAR(COALESCE(created_at, NOW())), '-', LPAD(id, 3, '0')) WHERE reference IS NULL");

        Schema::table('tickets', function (Blueprint $table) {
            $table->unique('reference');
        });
    }

    public function down(): void
    {
        Schema::table('tickets', function (Blueprint $table) {
            $table->dropUnique(['reference']);
            $table->dropColumn('reference');
        });
    }
};
