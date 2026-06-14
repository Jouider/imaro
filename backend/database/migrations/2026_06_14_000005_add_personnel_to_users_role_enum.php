<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * KAN-52 — le personnel de terrain a un compte de connexion : ajoute 'personnel'
 * à l'enum users.role.
 */
return new class extends Migration
{
    public function up(): void
    {
        DB::statement("ALTER TABLE users MODIFY COLUMN role ENUM(
            'super_admin','manager','gestionnaire','agent_recouvrement','conseil','resident','personnel'
        ) NOT NULL DEFAULT 'resident'");
    }

    public function down(): void
    {
        DB::statement("ALTER TABLE users MODIFY COLUMN role ENUM(
            'super_admin','manager','gestionnaire','agent_recouvrement','conseil','resident'
        ) NOT NULL DEFAULT 'resident'");
    }
};
