<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('appels_fonds_lignes', function (Blueprint $table) {
            $table->unsignedBigInteger('lot_id')->nullable()->after('coproprietaire_id');
            $table->foreign('lot_id')->references('id')->on('lots')->nullOnDelete();
            $table->index('lot_id');
        });

        // Backfill lot_id from coproprietaire
        DB::statement('
            UPDATE appels_fonds_lignes afl
            JOIN coproprietaires c ON c.id = afl.coproprietaire_id
            SET afl.lot_id = c.lot_id
        ');
    }

    public function down(): void
    {
        Schema::table('appels_fonds_lignes', function (Blueprint $table) {
            $table->dropForeign(['lot_id']);
            $table->dropIndex(['lot_id']);
            $table->dropColumn('lot_id');
        });
    }
};
