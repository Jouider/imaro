<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('residences', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('tenant_id');
            $table->unsignedBigInteger('gestionnaire_id')->nullable();
            $table->string('name');
            $table->string('address');
            $table->string('city');
            $table->string('photo')->nullable();
            $table->unsignedInteger('total_tantieme')->default(1000);
            $table->unsignedInteger('nb_lots')->default(0);
            $table->enum('status', ['active', 'archive'])->default('active');
            $table->timestamps();
            $table->softDeletes();

            $table->foreign('tenant_id')->references('id')->on('tenants')->cascadeOnDelete();
            $table->foreign('gestionnaire_id')->references('id')->on('users')->nullOnDelete();
            $table->index(['tenant_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('residences');
    }
};
