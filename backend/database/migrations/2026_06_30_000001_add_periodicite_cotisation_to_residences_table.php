<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Périodicité de cotisation par résidence (KAN-86) : mensuel / trimestriel /
 * semestriel / annuel. Défaut « trimestriel » → les résidences existantes
 * prennent ce défaut automatiquement.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('residences', function (Blueprint $table) {
            $table->enum('periodicite_cotisation', ['mensuel', 'trimestriel', 'semestriel', 'annuel'])
                ->default('trimestriel')
                ->after('jour_echeance');
        });
    }

    public function down(): void
    {
        Schema::table('residences', function (Blueprint $table) {
            $table->dropColumn('periodicite_cotisation');
        });
    }
};
