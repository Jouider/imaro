<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * KAN-72 / #251 — sessions de paiement en ligne (passerelle agnostique).
 * Le résident initie un paiement → on crée une session → la passerelle renvoie
 * une payment_url. Le statut est mis à jour au retour / webhook.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('payment_sessions', function (Blueprint $table) {
            $table->id();
            $table->uuid('session_id')->unique();
            $table->unsignedBigInteger('tenant_id')->index();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->unsignedBigInteger('coproprietaire_id')->nullable();
            $table->decimal('montant', 10, 2);
            $table->string('reference')->nullable();
            $table->string('gateway')->nullable();          // paydunya | cmi | …
            $table->string('gateway_ref')->nullable();       // id de transaction côté passerelle
            $table->text('payment_url')->nullable();
            $table->enum('statut', ['pending', 'success', 'cancel', 'failed'])->default('pending');
            $table->timestamps();

            $table->index(['tenant_id', 'statut']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('payment_sessions');
    }
};
