<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('annonces', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('tenant_id');
            $table->unsignedBigInteger('residence_id')->nullable();
            $table->unsignedBigInteger('created_by');
            $table->string('titre');
            $table->text('contenu');
            $table->enum('priorite', ['normale', 'urgente'])->default('normale');
            $table->enum('statut', ['brouillon', 'publiee', 'archivee'])->default('brouillon');
            $table->timestamp('publiee_at')->nullable();
            $table->timestamps();

            $table->foreign('tenant_id')->references('id')->on('tenants')->cascadeOnDelete();
            $table->foreign('residence_id')->references('id')->on('residences')->nullOnDelete();
            $table->foreign('created_by')->references('id')->on('users');
            $table->index(['tenant_id', 'statut']);
            $table->index(['residence_id', 'statut']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('annonces');
    }
};
