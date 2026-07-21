<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * KAN-147 — historique des sessions d'impersonation (dépannage).
 * Qui a dépanné quel cabinet, quand, combien de temps — et permet de
 * « terminer la session » (révocation du token) depuis le back-office.
 * Table PLATEFORME (pas de scope tenant).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('impersonation_sessions', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('admin_id');              // super_admin qui dépanne
            $table->unsignedBigInteger('tenant_id');             // cabinet dépanné
            $table->unsignedBigInteger('impersonated_user_id');  // compte emprunté
            $table->unsignedBigInteger('token_id')->nullable();  // personal_access_tokens.id
            $table->timestamp('started_at');
            $table->timestamp('expires_at')->nullable();
            $table->timestamp('ended_at')->nullable();           // révocation manuelle
            $table->unsignedBigInteger('ended_by')->nullable();
            $table->string('ip_address', 45)->nullable();
            $table->timestamps();

            $table->foreign('admin_id')->references('id')->on('users')->cascadeOnDelete();
            $table->foreign('tenant_id')->references('id')->on('tenants')->cascadeOnDelete();
            $table->foreign('impersonated_user_id')->references('id')->on('users')->cascadeOnDelete();
            $table->index(['started_at']);
            $table->index(['tenant_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('impersonation_sessions');
    }
};
