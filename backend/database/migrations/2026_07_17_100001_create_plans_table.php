<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Plans commerciaux (offres) gérés par le back-office Digitoyou — KAN-146.
 * Global (pas de tenant_id). Source de vérité des tarifs, quotas et
 * fonctionnalités incluses (liées aux feature flags, KAN-142).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('plans', function (Blueprint $table) {
            $table->id();
            $table->string('slug')->unique();
            $table->string('name');
            $table->unsignedInteger('price_dh')->default(0);
            $table->enum('period', ['mensuel', 'annuel'])->default('mensuel');
            // Quotas — null = illimité.
            $table->unsignedInteger('quota_residences')->nullable();
            $table->unsignedInteger('quota_lots')->nullable();
            $table->unsignedInteger('quota_users')->nullable();
            // Clés de fonctionnalités incluses (cf. feature flags KAN-142).
            $table->json('features')->nullable();
            $table->boolean('is_active')->default(true);
            $table->unsignedInteger('ordre')->default(0);
            $table->timestamps();

            $table->index('is_active');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('plans');
    }
};
