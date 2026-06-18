<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * KAN-96 — médias (photos + courtes vidéos) sur les annonces.
 * Stockés sur le disque public pour l'instant ; migration object storage prévue.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('annonces', function (Blueprint $table) {
            // [{ type: image|video, path, mime, taille_ko }]
            $table->json('media')->nullable()->after('contenu');
        });
    }

    public function down(): void
    {
        Schema::table('annonces', function (Blueprint $table) {
            $table->dropColumn('media');
        });
    }
};
