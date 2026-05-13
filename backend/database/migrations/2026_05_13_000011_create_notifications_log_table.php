<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('notifications_log', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('tenant_id');
            $table->unsignedBigInteger('user_id');
            $table->enum('canal', ['whatsapp', 'sms', 'email'])->default('whatsapp');
            $table->string('template_name');
            $table->string('content_preview', 200)->nullable();
            $table->enum('statut', ['en_attente', 'envoye', 'livre', 'lu', 'echec'])
                ->default('en_attente');
            $table->string('meta_message_id')->nullable();
            $table->text('error_message')->nullable();
            $table->timestamp('sent_at')->nullable();
            $table->timestamp('delivered_at')->nullable();
            $table->timestamp('read_at')->nullable();
            $table->timestamps();

            $table->foreign('tenant_id')->references('id')->on('tenants')->cascadeOnDelete();
            $table->foreign('user_id')->references('id')->on('users')->cascadeOnDelete();
            $table->index(['tenant_id', 'canal', 'statut']);
            $table->index('user_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('notifications_log');
    }
};
