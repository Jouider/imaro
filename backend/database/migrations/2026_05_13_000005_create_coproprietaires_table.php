<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('coproprietaires', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('tenant_id');
            $table->unsignedBigInteger('user_id');
            $table->unsignedBigInteger('lot_id');
            $table->enum('type', ['proprietaire', 'locataire', 'indivisaire'])
                ->default('proprietaire');
            $table->date('date_entree')->nullable();
            $table->decimal('solde_actuel', 10, 2)->default(0);
            $table->timestamps();
            $table->softDeletes();

            $table->foreign('tenant_id')->references('id')->on('tenants')->cascadeOnDelete();
            $table->foreign('user_id')->references('id')->on('users')->cascadeOnDelete();
            $table->foreign('lot_id')->references('id')->on('lots')->cascadeOnDelete();
            $table->index(['tenant_id', 'lot_id']);
            $table->index(['tenant_id', 'user_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('coproprietaires');
    }
};
