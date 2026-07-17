<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Champs d'abonnement sur les tenants — back-office facturation (KAN-140).
 * renewal_at = prochaine échéance de renouvellement ; discount_pct = remise
 * commerciale appliquée sur les factures.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('tenants', function (Blueprint $table) {
            $table->date('renewal_at')->nullable()->after('trial_ends_at');
            $table->unsignedTinyInteger('discount_pct')->default(0)->after('renewal_at');
        });
    }

    public function down(): void
    {
        Schema::table('tenants', function (Blueprint $table) {
            $table->dropColumn(['renewal_at', 'discount_pct']);
        });
    }
};
