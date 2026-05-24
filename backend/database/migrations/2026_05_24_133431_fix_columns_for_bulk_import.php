<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // lots.type: add commerce, bureau, autre
        DB::statement("ALTER TABLE lots MODIFY COLUMN `type` ENUM('appartement','local_commercial','commerce','parking','cave','bureau','autre') NOT NULL DEFAULT 'appartement'");

        // lots.etage: allow negative values (sous-sol)
        DB::statement("ALTER TABLE lots MODIFY COLUMN `etage` INT NOT NULL DEFAULT 0");

        // paiements.mode: add cb
        DB::statement("ALTER TABLE paiements MODIFY COLUMN `mode` ENUM('virement','cheque','especes','mobile','cb') NOT NULL DEFAULT 'virement'");

        // prestataires.telephone: make nullable
        DB::statement("ALTER TABLE prestataires MODIFY COLUMN `telephone` VARCHAR(255) NULL DEFAULT NULL");
    }

    public function down(): void
    {
        DB::statement("ALTER TABLE lots MODIFY COLUMN `type` ENUM('appartement','local_commercial','parking','cave') NOT NULL DEFAULT 'appartement'");
        DB::statement("ALTER TABLE lots MODIFY COLUMN `etage` INT UNSIGNED NOT NULL DEFAULT 0");
        DB::statement("ALTER TABLE paiements MODIFY COLUMN `mode` ENUM('virement','cheque','especes','mobile') NOT NULL DEFAULT 'virement'");
        DB::statement("ALTER TABLE prestataires MODIFY COLUMN `telephone` VARCHAR(255) NOT NULL");
    }
};
