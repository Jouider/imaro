<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Adds the "skipped" state to notifications_log.statut — used when a send is
 * intentionally muted by the recipient's notification_prefs (opt-out), as
 * opposed to a genuine "echec". MySQL-only ALTER; on sqlite (tests) the column
 * is plain text with no enum constraint, so nothing to do.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (DB::getDriverName() !== 'mysql') {
            return;
        }

        DB::statement(
            "ALTER TABLE notifications_log MODIFY COLUMN statut
             ENUM('en_attente', 'envoye', 'livre', 'lu', 'echec', 'skipped')
             NOT NULL DEFAULT 'en_attente'"
        );
    }

    public function down(): void
    {
        if (DB::getDriverName() !== 'mysql') {
            return;
        }

        // Collapse any skipped rows so they fit the original enum.
        DB::table('notifications_log')->where('statut', 'skipped')->update(['statut' => 'echec']);

        DB::statement(
            "ALTER TABLE notifications_log MODIFY COLUMN statut
             ENUM('en_attente', 'envoye', 'livre', 'lu', 'echec')
             NOT NULL DEFAULT 'en_attente'"
        );
    }
};
