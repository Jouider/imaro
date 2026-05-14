<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('paiements', function (Blueprint $table) {
            $table->unsignedBigInteger('exercice_id')->nullable()->after('tenant_id');
            $table->foreign('exercice_id')->references('id')->on('exercices')->nullOnDelete();
            $table->index('exercice_id');
        });
    }

    public function down(): void
    {
        Schema::table('paiements', function (Blueprint $table) {
            $table->dropForeign(['exercice_id']);
            $table->dropIndex(['exercice_id']);
            $table->dropColumn('exercice_id');
        });
    }
};
