<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * KAN-96 — likes (« j'aime ») sur les annonces du portail résident.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('annonce_likes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('annonce_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->timestamp('created_at')->nullable();

            $table->unique(['annonce_id', 'user_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('annonce_likes');
    }
};
