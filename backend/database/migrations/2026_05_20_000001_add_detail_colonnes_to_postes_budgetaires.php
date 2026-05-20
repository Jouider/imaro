<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('postes_budgetaires', function (Blueprint $table) {
            $table->unsignedBigInteger('prestataire_id')->nullable()->after('budget_id');
            $table->unsignedBigInteger('contrat_id')->nullable()->after('prestataire_id');
            $table->unsignedInteger('nombre')->nullable()->after('description');
            $table->decimal('prix_unitaire', 10, 2)->nullable()->after('nombre');
            $table->decimal('cout_mensuel', 10, 2)->default(0)->after('prix_unitaire');
            $table->date('date_debut')->nullable()->after('cout_mensuel');
            $table->date('date_fin')->nullable()->after('date_debut');
            $table->unsignedTinyInteger('nb_mois')->nullable()->after('date_fin');

            $table->foreign('prestataire_id')->references('id')->on('prestataires')->nullOnDelete();
            $table->foreign('contrat_id')->references('id')->on('contrats')->nullOnDelete();
            $table->index('prestataire_id');
            $table->index('contrat_id');
        });
    }

    public function down(): void
    {
        Schema::table('postes_budgetaires', function (Blueprint $table) {
            $table->dropForeign(['prestataire_id']);
            $table->dropForeign(['contrat_id']);
            $table->dropIndex(['prestataire_id']);
            $table->dropIndex(['contrat_id']);
            $table->dropColumn([
                'prestataire_id', 'contrat_id', 'nombre', 'prix_unitaire',
                'cout_mensuel', 'date_debut', 'date_fin', 'nb_mois',
            ]);
        });
    }
};
