<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('residences', function (Blueprint $table) {
            $table->unsignedTinyInteger('jour_echeance')->nullable()->after('cotisation_mensuelle');
        });
    }

    public function down(): void
    {
        Schema::table('residences', function (Blueprint $table) {
            $table->dropColumn('jour_echeance');
        });
    }
};
