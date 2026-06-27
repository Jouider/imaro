<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Retrait du délai de validation de 24 h (KAN-110 revu) : le syndic peut
 * valider un paiement déclaré immédiatement. La colonne validable_at devient
 * inutile.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasColumn('virements_declares', 'validable_at')) {
            Schema::table('virements_declares', function (Blueprint $table) {
                $table->dropColumn('validable_at');
            });
        }
    }

    public function down(): void
    {
        Schema::table('virements_declares', function (Blueprint $table) {
            $table->timestamp('validable_at')->nullable()->after('statut');
        });
    }
};
