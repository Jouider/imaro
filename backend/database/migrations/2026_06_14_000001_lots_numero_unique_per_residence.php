<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * KAN-40 — unicité du numéro de lot PAR RÉSIDENCE.
 *
 * La contrainte avait été déplacée vers (immeuble_id, numero) ; un même numéro
 * pouvait donc réapparaître dans une résidence (immeubles différents), d'où les
 * doublons signalés dans la liste de sélection. On revient à (residence_id, numero),
 * plus strict, après avoir dédoublonné les numéros existants.
 */
return new class extends Migration
{
    public function up(): void
    {
        // 1. Dédoublonnage : on garde le plus ancien lot par (residence_id, numero),
        //    on suffixe les autres avec leur id pour les rendre uniques sans perte.
        DB::statement(<<<'SQL'
            UPDATE lots l
            JOIN (
                SELECT id,
                       ROW_NUMBER() OVER (PARTITION BY residence_id, numero ORDER BY id) AS rn
                FROM lots
            ) d ON l.id = d.id AND d.rn > 1
            SET l.numero = CONCAT(l.numero, '-', l.id)
        SQL);

        // 2. Bascule de la contrainte unique vers la résidence.
        //    immeuble_id conserve son index simple (FK) ajouté par la migration immeuble.
        Schema::table('lots', function (Blueprint $table) {
            $table->dropUnique(['immeuble_id', 'numero']);
            $table->unique(['residence_id', 'numero']);
        });
    }

    public function down(): void
    {
        Schema::table('lots', function (Blueprint $table) {
            $table->dropUnique(['residence_id', 'numero']);
            $table->unique(['immeuble_id', 'numero']);
        });
    }
};
