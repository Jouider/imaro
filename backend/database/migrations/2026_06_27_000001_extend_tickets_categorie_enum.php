<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * KAN-55 — étend l'enum tickets.categorie de 6 à 13 catégories pour couvrir
 * toutes les catégories du portail résident (Chauffage, Parking, Nuisances,
 * Espaces verts, Interphone, Parties communes, Dégât des eaux).
 */
return new class extends Migration
{
    public function up(): void
    {
        DB::statement(
            "ALTER TABLE tickets MODIFY COLUMN categorie ENUM("
            ."'parties_communes','ascenseur','plomberie','electricite',"
            ."'chauffage','securite','proprete','nuisances',"
            ."'espaces_verts','parking','interphone','degat_eaux','autre'"
            .") NOT NULL DEFAULT 'autre'"
        );
    }

    public function down(): void
    {
        DB::statement(
            "ALTER TABLE tickets MODIFY COLUMN categorie ENUM("
            ."'plomberie','electricite','ascenseur','proprete','securite','autre'"
            .") NOT NULL DEFAULT 'autre'"
        );
    }
};
