<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * KAN-142 — registre de feature flags + entitlements par plan.
 * Permet d'activer/désactiver une fonctionnalité par plan sans redéploiement.
 * Table PLATEFORME (pas de tenant_id).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('feature_flags', function (Blueprint $table) {
            $table->id();
            $table->string('key')->unique();
            $table->string('label');
            $table->text('description')->nullable();
            $table->json('enabled_plans');  // slugs de plans où la feature est active
            $table->timestamps();
        });

        // Registre initial — slugs de plans réels (cf. config/plans.php).
        $now = now();
        DB::table('feature_flags')->insert([
            [
                'key' => 'ai',
                'label' => 'Assistant IA (EMARO)',
                'description' => "Chat IA, import IA de factures, suggestions. Désactivé pour l'instant (coût — KAN-111). Le kill-switch global FEATURE_IA prime.",
                'enabled_plans' => json_encode([]),
                'created_at' => $now, 'updated_at' => $now,
            ],
            [
                'key' => 'mobile',
                'label' => 'Application mobile',
                'description' => 'Accès au portail résident via l’app iOS/Android.',
                'enabled_plans' => json_encode(['business', 'large', 'enterprise']),
                'created_at' => $now, 'updated_at' => $now,
            ],
            [
                'key' => 'budgets_avances',
                'label' => 'Budgets avancés',
                'description' => 'Comparatif budget/réel, budgets pluriannuels.',
                'enabled_plans' => json_encode(['business', 'large', 'enterprise']),
                'created_at' => $now, 'updated_at' => $now,
            ],
            [
                'key' => 'ocr_factures',
                'label' => 'OCR des factures',
                'description' => 'Pré-remplissage des dépenses par lecture de facture.',
                'enabled_plans' => json_encode(['large', 'enterprise']),
                'created_at' => $now, 'updated_at' => $now,
            ],
            [
                'key' => 'exports_comptables',
                'label' => 'Exports comptables (FEC, xlsx)',
                'description' => 'Journal, grand-livre, balance, FEC.',
                'enabled_plans' => json_encode(['starter', 'growth', 'pro', 'business', 'large', 'enterprise']),
                'created_at' => $now, 'updated_at' => $now,
            ],
        ]);
    }

    public function down(): void
    {
        Schema::dropIfExists('feature_flags');
    }
};
