<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\Schema;

/**
 * Suppression de la table bons_paiement (KAN-110 revu) : la fonctionnalité
 * « bon de paiement » faisait doublon avec le flux « déclarer un paiement »
 * (virements_declares → Paiement + reçu). Le bon est désormais le reçu PDF du
 * paiement déclaré, disponible après validation du syndic (délai 24 h).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::dropIfExists('bons_paiement');
    }

    public function down(): void
    {
        // Pas de recréation : la feature a été retirée.
    }
};
