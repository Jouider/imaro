<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('lots', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('tenant_id');
            $table->unsignedBigInteger('residence_id');
            $table->string('numero');
            $table->unsignedInteger('etage')->default(0);
            $table->enum('type', ['appartement', 'local_commercial', 'parking', 'cave'])
                ->default('appartement');
            $table->decimal('superficie', 8, 2)->nullable();
            $table->decimal('tantieme', 8, 2)->default(0);
            $table->timestamps();
            $table->softDeletes();

            $table->foreign('tenant_id')->references('id')->on('tenants')->cascadeOnDelete();
            $table->foreign('residence_id')->references('id')->on('residences')->cascadeOnDelete();
            $table->index(['tenant_id', 'residence_id']);
            $table->unique(['residence_id', 'numero']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('lots');
    }
};
