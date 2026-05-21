<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('immeubles', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('tenant_id');
            $table->unsignedBigInteger('residence_id');
            $table->unsignedBigInteger('groupe_habitation_id')->nullable();
            $table->string('nom');
            $table->string('adresse')->nullable();
            $table->unsignedInteger('nb_etages')->default(0);
            $table->unsignedInteger('nb_lots')->default(0);
            $table->timestamps();
            $table->softDeletes();

            $table->foreign('tenant_id')->references('id')->on('tenants')->cascadeOnDelete();
            $table->foreign('residence_id')->references('id')->on('residences')->cascadeOnDelete();
            $table->foreign('groupe_habitation_id')->references('id')->on('groupes_habitations')->nullOnDelete();
            $table->unique(['residence_id', 'nom']);
            $table->index(['tenant_id', 'residence_id']);
            $table->index('groupe_habitation_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('immeubles');
    }
};
