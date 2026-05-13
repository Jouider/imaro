<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('votes_ag', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('assemblee_id');
            $table->unsignedBigInteger('user_id');
            $table->unsignedBigInteger('procuration_user_id')->nullable();
            $table->string('resolution');
            $table->enum('vote', ['pour', 'contre', 'abstention']);
            $table->timestamp('voted_at')->nullable();
            $table->timestamps();

            $table->foreign('assemblee_id')->references('id')->on('assemblees')->cascadeOnDelete();
            $table->foreign('user_id')->references('id')->on('users')->cascadeOnDelete();
            $table->foreign('procuration_user_id')->references('id')->on('users')->nullOnDelete();
            $table->unique(['assemblee_id', 'user_id', 'resolution']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('votes_ag');
    }
};
