<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // 1. Add nullable immeuble_id
        Schema::table('lots', function (Blueprint $table) {
            $table->unsignedBigInteger('immeuble_id')->nullable()->after('residence_id');
            $table->foreign('immeuble_id')->references('id')->on('immeubles')->cascadeOnDelete();
            $table->index('immeuble_id');
        });

        // 2. Create a default immeuble per existing residence and assign lots
        $residences = DB::table('residences')->whereNull('deleted_at')->get();
        foreach ($residences as $residence) {
            $immeubleId = DB::table('immeubles')->insertGetId([
                'tenant_id'              => $residence->tenant_id,
                'residence_id'           => $residence->id,
                'groupe_habitation_id'   => null,
                'nom'                    => 'Immeuble Principal',
                'nb_etages'              => 0,
                'nb_lots'                => $residence->nb_lots,
                'created_at'             => now(),
                'updated_at'             => now(),
            ]);

            DB::table('lots')
                ->where('residence_id', $residence->id)
                ->whereNull('deleted_at')
                ->update(['immeuble_id' => $immeubleId]);
        }

        // 3. Make immeuble_id non-nullable
        Schema::table('lots', function (Blueprint $table) {
            $table->unsignedBigInteger('immeuble_id')->nullable(false)->change();
        });

        // 4. Change unique constraint from [residence_id, numero] to [immeuble_id, numero]
        // MySQL needs a plain index on residence_id before dropping the composite unique (which supported the FK)
        Schema::table('lots', function (Blueprint $table) {
            $table->index('residence_id', 'lots_residence_id_plain_index');
        });
        Schema::table('lots', function (Blueprint $table) {
            $table->dropUnique(['residence_id', 'numero']);
            $table->unique(['immeuble_id', 'numero']);
        });
    }

    public function down(): void
    {
        Schema::table('lots', function (Blueprint $table) {
            $table->dropUnique(['immeuble_id', 'numero']);
            $table->unique(['residence_id', 'numero']);
            $table->dropForeign(['immeuble_id']);
            $table->dropIndex(['immeuble_id']);
            $table->dropColumn('immeuble_id');
        });
    }
};
