<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('residences', function (Blueprint $table) {
            $table->enum('mode_cotisation', ['fixe', 'tantieme'])->default('tantieme')->after('total_tantieme');
            $table->decimal('cotisation_mensuelle', 10, 2)->nullable()->after('mode_cotisation');
        });
    }

    public function down(): void
    {
        Schema::table('residences', function (Blueprint $table) {
            $table->dropColumn(['mode_cotisation', 'cotisation_mensuelle']);
        });
    }
};
