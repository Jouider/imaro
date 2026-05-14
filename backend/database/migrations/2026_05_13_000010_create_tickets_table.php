<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('tickets', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('tenant_id');
            $table->unsignedBigInteger('residence_id');
            $table->unsignedBigInteger('lot_id')->nullable();
            $table->unsignedBigInteger('user_id');
            $table->unsignedBigInteger('prestataire_id')->nullable();
            $table->enum('categorie', [
                'plomberie', 'electricite', 'ascenseur',
                'proprete', 'securite', 'autre',
            ])->default('autre');
            $table->text('description');
            $table->enum('priorite', ['urgent', 'normal', 'faible'])->default('normal');
            $table->enum('statut', ['ouvert', 'en_cours', 'resolu', 'clos'])->default('ouvert');
            $table->decimal('cout_estime', 10, 2)->nullable();
            $table->decimal('cout_reel', 10, 2)->nullable();
            $table->unsignedTinyInteger('note_satisfaction')->nullable();
            $table->json('images')->nullable();
            $table->timestamp('closed_at')->nullable();
            $table->timestamps();

            $table->foreign('tenant_id')->references('id')->on('tenants')->cascadeOnDelete();
            $table->foreign('residence_id')->references('id')->on('residences')->cascadeOnDelete();
            $table->foreign('lot_id')->references('id')->on('lots')->nullOnDelete();
            $table->foreign('user_id')->references('id')->on('users');
            $table->foreign('prestataire_id')->references('id')->on('prestataires')->nullOnDelete();
            $table->index(['tenant_id', 'statut', 'priorite']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('tickets');
    }
};
