<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('push_subscriptions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('tenant_id')->index();
            $table->text('endpoint');
            $table->string('endpoint_hash', 64)->index();
            $table->string('p256dh', 512);
            $table->string('auth', 128);
            $table->string('user_agent')->nullable();
            $table->timestamps();

            $table->unique(['user_id', 'endpoint_hash'], 'push_subscriptions_user_endpoint_unique');
            $table->index(['user_id', 'tenant_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('push_subscriptions');
    }
};
