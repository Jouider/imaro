<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Date de création / anniversaire de la résidence (KAN-95). L'exercice (12 mois
 * glissants) et l'AG s'appuient dessus. Nullable → les résidences existantes
 * conservent le cycle au 1er janvier par défaut (compat ascendante).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('residences', function (Blueprint $table) {
            $table->date('date_anniversaire')->nullable()->after('periodicite_cotisation');
        });
    }

    public function down(): void
    {
        Schema::table('residences', function (Blueprint $table) {
            $table->dropColumn('date_anniversaire');
        });
    }
};
