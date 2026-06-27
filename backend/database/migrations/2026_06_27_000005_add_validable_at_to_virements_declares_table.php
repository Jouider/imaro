<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Délai légal de 24 h avant validation d'un paiement déclaré par le syndic
 * (KAN-110 revu). validable_at = date de déclaration + 24 h ; le syndic ne peut
 * pas valider avant.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('virements_declares', function (Blueprint $table) {
            $table->timestamp('validable_at')->nullable()->after('statut');
        });

        // Rétro-compat : les déclarations existantes deviennent validables 24 h
        // après leur création.
        DB::table('virements_declares')
            ->whereNull('validable_at')
            ->update(['validable_at' => DB::raw('DATE_ADD(created_at, INTERVAL 24 HOUR)')]);
    }

    public function down(): void
    {
        Schema::table('virements_declares', function (Blueprint $table) {
            $table->dropColumn('validable_at');
        });
    }
};
