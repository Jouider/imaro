<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * KAN-93 — ajoute « categorie » à l'enum residences.mode_cotisation.
 */
return new class extends Migration
{
    public function up(): void
    {
        DB::statement("ALTER TABLE residences MODIFY COLUMN mode_cotisation ENUM('fixe', 'tantieme', 'categorie') NOT NULL DEFAULT 'tantieme'");
    }

    public function down(): void
    {
        DB::statement("ALTER TABLE residences MODIFY COLUMN mode_cotisation ENUM('fixe', 'tantieme') NOT NULL DEFAULT 'tantieme'");
    }
};
