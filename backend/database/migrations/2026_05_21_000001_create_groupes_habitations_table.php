<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('groupes_habitations', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('tenant_id');
            $table->unsignedBigInteger('residence_id');
            $table->string('nom');
            $table->text('description')->nullable();
            $table->decimal('total_tantieme', 10, 2)->default(1000);
            $table->timestamps();
            $table->softDeletes();

            $table->foreign('tenant_id')->references('id')->on('tenants')->cascadeOnDelete();
            $table->foreign('residence_id')->references('id')->on('residences')->cascadeOnDelete();
            $table->unique(['residence_id', 'nom']);
            $table->index(['tenant_id', 'residence_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('groupes_habitations');
    }
};
