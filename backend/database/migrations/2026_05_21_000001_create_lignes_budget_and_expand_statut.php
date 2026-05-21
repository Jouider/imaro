<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Expand budget statut to support Annexe 5 workflow
        DB::statement("ALTER TABLE budgets MODIFY COLUMN statut ENUM('brouillon','soumis_ag','approuve','verrouille') DEFAULT 'brouillon'");

        // Add version column to budgets
        Schema::table('budgets', function (Blueprint $table) {
            $table->unsignedSmallInteger('version')->default(1)->after('statut');
        });

        // Create lignes_budget table (Annexe 5 format)
        Schema::create('lignes_budget', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('budget_id');
            $table->string('compte_pcg', 10);
            $table->string('libelle', 255);
            $table->enum('type', ['charge_courante', 'charge_travaux', 'produit_courant', 'produit_travaux']);
            $table->decimal('realise_n1', 12, 2)->default(0);
            $table->decimal('budget_n', 12, 2)->default(0);
            $table->decimal('engagement', 12, 2)->default(0);
            $table->decimal('realise', 12, 2)->default(0);
            $table->unsignedSmallInteger('ordre')->default(0);
            $table->timestamps();

            $table->foreign('budget_id')->references('id')->on('budgets')->cascadeOnDelete();
            $table->index('budget_id');
            $table->index('type');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('lignes_budget');

        Schema::table('budgets', function (Blueprint $table) {
            $table->dropColumn('version');
        });

        DB::statement("ALTER TABLE budgets MODIFY COLUMN statut ENUM('brouillon','approuve') DEFAULT 'brouillon'");
    }
};
