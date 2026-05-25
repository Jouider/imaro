<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('paiements', function (Blueprint $table) {
            $table->decimal('penalty_amount', 10, 2)->default(0)->after('note');
            $table->timestamp('penalty_calculated_at')->nullable()->after('penalty_amount');
            $table->timestamp('mise_en_demeure_sent_at')->nullable()->after('penalty_calculated_at');
            $table->string('mise_en_demeure_pdf_url', 500)->nullable()->after('mise_en_demeure_sent_at');
        });
    }

    public function down(): void
    {
        Schema::table('paiements', function (Blueprint $table) {
            $table->dropColumn([
                'penalty_amount',
                'penalty_calculated_at',
                'mise_en_demeure_sent_at',
                'mise_en_demeure_pdf_url',
            ]);
        });
    }
};
