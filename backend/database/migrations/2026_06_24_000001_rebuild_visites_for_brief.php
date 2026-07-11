<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * KAN-102 (réalignement) — reconstruit la feature Visites sur le brief
 * docs/feature-visites-backend-brief.md (contrat du frontend déjà câblé).
 * Remplace la table `visites` minimale par le schéma complet + journal de scans.
 * (Aucune donnée réelle en prod/staging → drop & recreate.)
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::dropIfExists('visites');

        Schema::create('visites', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('tenant_id')->index();
            $table->foreignId('residence_id')->constrained()->cascadeOnDelete();
            $table->string('qr_token', 32)->unique();
            $table->string('visitor_name');
            $table->string('visitor_phone')->nullable();
            $table->enum('type', ['visitor', 'delivery', 'contractor', 'prestataire'])->default('visitor');
            $table->text('purpose')->nullable();
            $table->foreignId('host_lot_id')->nullable()->constrained('lots')->nullOnDelete();
            $table->unsignedBigInteger('host_user_id')->nullable();  // résident hôte
            $table->timestamp('planned_at')->nullable();
            $table->timestamp('arrived_at')->nullable();
            $table->timestamp('left_at')->nullable();
            $table->enum('status', ['planned', 'arrived', 'departed', 'expired', 'cancelled'])->default('planned');
            $table->string('photo_url')->nullable();
            $table->boolean('is_recurring')->default(false);
            $table->string('recurrence')->nullable();
            $table->unsignedBigInteger('created_by_id')->nullable();
            $table->timestamps();

            $table->index(['residence_id', 'status']);
            $table->index('planned_at');
        });

        Schema::create('visite_scan_logs', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('tenant_id')->index();
            $table->foreignId('visite_id')->constrained()->cascadeOnDelete();
            $table->unsignedBigInteger('scanned_by_id')->nullable(); // user (personnel/gestionnaire)
            $table->enum('action', ['check_in', 'check_out', 'rejected']);
            $table->string('reason')->nullable();
            $table->timestamp('scanned_at');
            $table->timestamps();

            $table->index('visite_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('visite_scan_logs');
        Schema::dropIfExists('visites');

        // Recrée la table minimale d'origine (rollback de sécurité).
        Schema::create('visites', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('tenant_id')->index();
            $table->foreignId('residence_id')->constrained()->cascadeOnDelete();
            $table->foreignId('lot_id')->nullable()->constrained()->nullOnDelete();
            $table->unsignedBigInteger('coproprietaire_id')->nullable();
            $table->unsignedBigInteger('declarant_user_id')->nullable();
            $table->string('resident_nom');
            $table->string('lot_numero')->nullable();
            $table->string('visiteur_nom');
            $table->string('motif')->nullable();
            $table->date('date_visite');
            $table->string('qr_token', 64)->unique();
            $table->string('statut', 20)->default('attendu');
            $table->timestamp('scanned_at')->nullable();
            $table->unsignedBigInteger('scanned_by')->nullable();
            $table->timestamps();
        });
    }
};
