<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('bilan_ouverture_lignes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained()->cascadeOnDelete();
            $table->foreignId('residence_id')->constrained()->cascadeOnDelete();
            $table->foreignId('exercice_id')->constrained()->cascadeOnDelete();
            $table->foreignId('created_by')->constrained('users')->cascadeOnDelete();
            $table->string('numero_compte', 10);
            $table->string('libelle');
            $table->decimal('solde_debit', 14, 2)->default(0);
            $table->decimal('solde_credit', 14, 2)->default(0);
            $table->timestamps();

            $table->index(['tenant_id', 'residence_id', 'exercice_id'], 'bol_tenant_res_ex');
            $table->unique(['residence_id', 'exercice_id', 'numero_compte'], 'bol_res_ex_compte_unique');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('bilan_ouverture_lignes');
    }
};
