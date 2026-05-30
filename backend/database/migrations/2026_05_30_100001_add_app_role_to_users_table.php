<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('app_role')->nullable()->after('role');
            $table->json('app_permissions')->nullable()->after('app_role');
            $table->json('equipe_residence_ids')->nullable()->after('app_permissions');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['app_role', 'app_permissions', 'equipe_residence_ids']);
        });
    }
};
