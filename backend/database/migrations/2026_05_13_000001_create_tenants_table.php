<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('tenants', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('email')->unique();
            $table->string('phone')->nullable();
            $table->string('logo')->nullable();
            $table->enum('plan', ['starter', 'growth', 'pro', 'business', 'large', 'enterprise'])
                ->default('starter');
            $table->unsignedInteger('max_logins')->default(100);
            $table->string('rc')->nullable();
            $table->string('if_number')->nullable();
            $table->string('rib')->nullable();
            $table->string('subdomain')->unique();
            $table->enum('status', ['trial', 'active', 'suspended'])->default('trial');
            $table->timestamp('trial_ends_at')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index('subdomain');
            $table->index('status');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('tenants');
    }
};
