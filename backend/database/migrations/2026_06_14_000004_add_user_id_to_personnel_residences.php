<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * KAN-52 — le personnel de terrain reçoit un compte de connexion (téléphone + code
 * d'accès, comme les résidents). On relie l'enregistrement annuaire au User login.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('personnel_residences', function (Blueprint $table) {
            $table->unsignedBigInteger('user_id')->nullable()->after('residence_id');
            $table->foreign('user_id')->references('id')->on('users')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('personnel_residences', function (Blueprint $table) {
            $table->dropForeign(['user_id']);
            $table->dropColumn('user_id');
        });
    }
};
