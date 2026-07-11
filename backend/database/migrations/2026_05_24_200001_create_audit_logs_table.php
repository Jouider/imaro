<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('audit_logs', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('tenant_id');
            $table->unsignedBigInteger('user_id')->nullable();
            $table->string('user_email')->nullable();
            $table->enum('category', [
                'immeuble', 'lot', 'coproprietaire', 'paiement', 'depense',
                'budget', 'ag', 'document', 'user', 'auth', 'system',
            ]);
            $table->string('action', 100);
            $table->enum('severity', ['info', 'warning', 'sensitive', 'error'])->default('info');
            $table->string('target_type', 100)->nullable();
            $table->unsignedBigInteger('target_id')->nullable();
            $table->string('target_label')->nullable();
            $table->json('payload')->nullable();
            $table->string('ip_address', 45)->nullable();
            $table->text('user_agent')->nullable();
            $table->timestamp('created_at')->useCurrent();

            $table->index(['tenant_id', 'created_at'], 'idx_tenant_created');
            $table->index(['tenant_id', 'category'], 'idx_category');
            $table->index(['tenant_id', 'target_type', 'target_id'], 'idx_target');
            $table->index(['tenant_id', 'severity'], 'idx_severity');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('audit_logs');
    }
};
