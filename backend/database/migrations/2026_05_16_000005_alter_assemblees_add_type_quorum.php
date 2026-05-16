<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('assemblees', function (Blueprint $table) {
            $table->enum('type', ['ordinaire', 'extraordinaire'])->default('ordinaire')->after('titre');
            $table->unsignedTinyInteger('quorum_requis')->default(50)->after('lieu');
        });
    }

    public function down(): void
    {
        Schema::table('assemblees', function (Blueprint $table) {
            $table->dropColumn(['type', 'quorum_requis']);
        });
    }
};
