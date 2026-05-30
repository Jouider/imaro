<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('personnel_residences', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('tenant_id');
            $table->string('name');
            $table->string('poste'); // securite, menage, gardien, jardinier, technicien, concierge
            $table->unsignedBigInteger('residence_id');
            $table->string('phone', 20)->nullable();
            $table->json('permissions')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            $table->softDeletes();

            $table->foreign('tenant_id')->references('id')->on('tenants')->cascadeOnDelete();
            $table->foreign('residence_id')->references('id')->on('residences')->cascadeOnDelete();
            $table->index(['tenant_id', 'is_active']);
            $table->index(['residence_id', 'is_active']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('personnel_residences');
    }
};
