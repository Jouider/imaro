<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('occupants', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('tenant_id');
            $table->unsignedBigInteger('lot_id');
            $table->unsignedBigInteger('coproprietaire_id')->nullable();
            $table->string('nom');
            $table->string('telephone', 20)->nullable();
            $table->string('email')->nullable();
            $table->enum('type', ['proprietaire_occupant', 'locataire', 'usufruitier', 'autre']);
            $table->date('date_debut');
            $table->date('date_fin')->nullable();
            $table->string('contact_urgence_nom')->nullable();
            $table->string('contact_urgence_telephone', 20)->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->index('lot_id', 'idx_lot');
            $table->index('tenant_id', 'idx_tenant');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('occupants');
    }
};
