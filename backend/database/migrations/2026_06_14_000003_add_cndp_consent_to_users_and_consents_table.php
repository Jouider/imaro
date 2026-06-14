<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * KAN-60 — consentement CNDP (loi 09-08) opposable.
 *
 * Sur `users` : dernier consentement (accès rapide). Sur `cndp_consents` :
 * l'historique complet (qui / quand / version / IP / user-agent) — preuve opposable.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->timestamp('cndp_consent_at')->nullable()->after('status');
            $table->string('cndp_policy_version')->nullable()->after('cndp_consent_at');
        });

        Schema::create('cndp_consents', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('tenant_id')->nullable();
            $table->unsignedBigInteger('user_id');
            $table->string('policy_version');
            $table->timestamp('consented_at');
            $table->string('ip', 45)->nullable();
            $table->string('user_agent', 512)->nullable();
            $table->timestamps();

            $table->index(['user_id', 'consented_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('cndp_consents');

        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['cndp_consent_at', 'cndp_policy_version']);
        });
    }
};
