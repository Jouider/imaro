<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('assemblees', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('tenant_id');
            $table->unsignedBigInteger('residence_id');
            $table->unsignedBigInteger('created_by');
            $table->string('titre');
            $table->dateTime('date');
            $table->string('lieu')->nullable();
            $table->text('ordre_du_jour')->nullable();
            $table->enum('statut', ['planifiee', 'tenue', 'annulee'])->default('planifiee');
            $table->boolean('quorum_atteint')->default(false);
            $table->string('pv_pdf_path')->nullable();
            $table->timestamps();

            $table->foreign('tenant_id')->references('id')->on('tenants')->cascadeOnDelete();
            $table->foreign('residence_id')->references('id')->on('residences')->cascadeOnDelete();
            $table->foreign('created_by')->references('id')->on('users');
            $table->index(['tenant_id', 'statut']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('assemblees');
    }
};
