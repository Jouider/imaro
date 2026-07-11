<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('exercices', function (Blueprint $table) {
            $table->unsignedBigInteger('groupe_habitation_id')->nullable()->after('residence_id');
            $table->foreign('groupe_habitation_id')->references('id')->on('groupes_habitations')->nullOnDelete();
            $table->index('groupe_habitation_id');
        });

        Schema::table('budgets', function (Blueprint $table) {
            $table->unsignedBigInteger('groupe_habitation_id')->nullable()->after('residence_id');
            $table->foreign('groupe_habitation_id')->references('id')->on('groupes_habitations')->nullOnDelete();
            $table->index('groupe_habitation_id');
            // Add plain index on residence_id before dropping the composite unique (MySQL FK requirement)
            $table->index('residence_id', 'budgets_residence_id_plain_index');
        });
        Schema::table('budgets', function (Blueprint $table) {
            $table->dropUnique(['residence_id', 'exercice_id']);
            $table->unique(['residence_id', 'groupe_habitation_id', 'exercice_id'], 'budgets_res_gh_exercice_unique');
        });

        Schema::table('appels_fonds', function (Blueprint $table) {
            $table->unsignedBigInteger('groupe_habitation_id')->nullable()->after('residence_id');
            $table->foreign('groupe_habitation_id')->references('id')->on('groupes_habitations')->nullOnDelete();
            $table->index('groupe_habitation_id');
        });

        Schema::table('depenses', function (Blueprint $table) {
            $table->unsignedBigInteger('groupe_habitation_id')->nullable()->after('residence_id');
            $table->foreign('groupe_habitation_id')->references('id')->on('groupes_habitations')->nullOnDelete();
            $table->index('groupe_habitation_id');
        });
    }

    public function down(): void
    {
        Schema::table('depenses', function (Blueprint $table) {
            $table->dropForeign(['groupe_habitation_id']);
            $table->dropIndex(['groupe_habitation_id']);
            $table->dropColumn('groupe_habitation_id');
        });

        Schema::table('appels_fonds', function (Blueprint $table) {
            $table->dropForeign(['groupe_habitation_id']);
            $table->dropIndex(['groupe_habitation_id']);
            $table->dropColumn('groupe_habitation_id');
        });

        Schema::table('budgets', function (Blueprint $table) {
            $table->dropUnique('budgets_res_gh_exercice_unique');
            $table->unique(['residence_id', 'exercice_id']);
            $table->dropForeign(['groupe_habitation_id']);
            $table->dropIndex(['groupe_habitation_id']);
            $table->dropColumn('groupe_habitation_id');
        });

        Schema::table('exercices', function (Blueprint $table) {
            $table->dropForeign(['groupe_habitation_id']);
            $table->dropIndex(['groupe_habitation_id']);
            $table->dropColumn('groupe_habitation_id');
        });
    }
};
