<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * KAN-102 — visites attendues + scan QR par l'agent de sécurité.
 * Le résident déclare un visiteur attendu (génère un qr_token) ; l'agent
 * scanne le QR à l'entrée pour vérifier que le visiteur est bien attendu.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('visites', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('tenant_id')->index();
            $table->foreignId('residence_id')->constrained()->cascadeOnDelete();
            $table->foreignId('lot_id')->nullable()->constrained()->nullOnDelete();
            $table->unsignedBigInteger('coproprietaire_id')->nullable();
            $table->unsignedBigInteger('declarant_user_id')->nullable();

            // Dénormalisé pour l'écran agent (robuste même si copro/lot évolue).
            $table->string('resident_nom');
            $table->string('lot_numero')->nullable();

            $table->string('visiteur_nom');
            $table->string('motif')->nullable();
            $table->date('date_visite');

            $table->string('qr_token', 64)->unique();
            $table->string('statut', 20)->default('attendu'); // attendu | scanne | annule
            $table->timestamp('scanned_at')->nullable();
            $table->unsignedBigInteger('scanned_by')->nullable(); // user (personnel) ayant scanné

            $table->timestamps();

            $table->index(['residence_id', 'date_visite']);
            $table->index(['coproprietaire_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('visites');
    }
};
