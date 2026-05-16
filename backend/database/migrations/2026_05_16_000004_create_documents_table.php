<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('documents', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('tenant_id');
            $table->unsignedBigInteger('residence_id')->nullable();
            $table->unsignedBigInteger('uploaded_by');
            $table->string('nom');
            $table->enum('type', ['reglement', 'pv_ag', 'contrat', 'facture', 'autre']);
            $table->string('file_path');
            $table->string('mime_type')->nullable();
            $table->unsignedInteger('taille_ko')->default(0);
            $table->date('date')->nullable();
            $table->timestamps();

            $table->foreign('tenant_id')->references('id')->on('tenants')->cascadeOnDelete();
            $table->foreign('residence_id')->references('id')->on('residences')->nullOnDelete();
            $table->foreign('uploaded_by')->references('id')->on('users');
            $table->index(['tenant_id', 'type']);
            $table->index('residence_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('documents');
    }
};
