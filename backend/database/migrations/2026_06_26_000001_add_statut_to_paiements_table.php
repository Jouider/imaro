<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * KAN-85 — un chèque encaissé puis rejeté par la banque : statut du paiement
 * + horodatage + motif. `statut` null = paiement valide (existant inchangé).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('paiements', function (Blueprint $table) {
            $table->string('statut', 20)->nullable()->after('mode'); // null|cheque_rejete
            $table->timestamp('cheque_rejete_at')->nullable()->after('statut');
            $table->string('motif_rejet')->nullable()->after('cheque_rejete_at');
        });
    }

    public function down(): void
    {
        Schema::table('paiements', function (Blueprint $table) {
            $table->dropColumn(['statut', 'cheque_rejete_at', 'motif_rejet']);
        });
    }
};
