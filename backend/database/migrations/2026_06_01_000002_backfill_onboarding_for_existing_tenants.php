<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Mark tenants that already have at least one résidence as "onboarded".
     * Without this, every existing cabinet would see the wizard on next login
     * even though they already have years of data.
     *
     * New tenants (no residences) keep onboarding_completed_at = NULL → wizard
     * triggers on their first manager login.
     */
    public function up(): void
    {
        DB::table('tenants')
            ->whereNull('onboarding_completed_at')
            ->whereIn('id', function ($q) {
                $q->select('tenant_id')->distinct()->from('residences');
            })
            ->update(['onboarding_completed_at' => now()]);
    }

    public function down(): void
    {
        // Irreversible — we lose which tenants were backfilled vs naturally
        // completed. Manual revert only if absolutely needed.
    }
};
