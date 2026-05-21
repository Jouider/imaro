<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('prestataires', function (Blueprint $table) {
            $table->enum('statut', ['actif', 'inactif'])->default('actif')->after('nb_interventions');
        });
    }

    public function down(): void
    {
        Schema::table('prestataires', function (Blueprint $table) {
            $table->dropColumn('statut');
        });
    }
};
