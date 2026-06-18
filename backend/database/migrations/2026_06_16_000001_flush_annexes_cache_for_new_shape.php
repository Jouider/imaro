<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * La forme des annexes (10, 13-1, 13-2) a changé pour correspondre exactement au
 * contrat du générateur PDF frontend. Les entrées en cache contiennent l'ancienne
 * forme et feraient planter le PDF → on vide le cache, il se régénère à la volée.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('annexes_cache')) {
            DB::table('annexes_cache')->delete();
        }
    }

    public function down(): void
    {
        // Donnée dérivée : rien à restaurer.
    }
};
