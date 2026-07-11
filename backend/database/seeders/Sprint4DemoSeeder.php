<?php

namespace Database\Seeders;

use App\Models\AuditLog;
use App\Models\ComplianceCalendarTask;
use App\Models\Occupant;
use App\Models\PenaltyConfig;
use App\Models\AnnexeCache;
use App\Models\Residence;
use App\Services\AnnexeGeneratorService;
use App\Services\ComplianceCalendarService;
use Carbon\Carbon;
use Illuminate\Database\Seeder;

class Sprint4DemoSeeder extends Seeder
{
    public function run(): void
    {
        $this->command->info('Seeding Sprint 4 demo data...');

        $tenantId = 1;
        $residences = Residence::where('tenant_id', $tenantId)->get();

        foreach ($residences as $residence) {
            $this->seedAuditLogs($tenantId);
            $this->seedOccupants($tenantId, $residence);
            $this->seedPenaltyConfig($residence);
            $this->seedComplianceCalendar($residence);
            $this->seedAnnexesCache($residence);
        }

        $this->command->info('Sprint 4 demo data seeded successfully!');
    }

    private function seedAuditLogs(int $tenantId): void
    {
        if (AuditLog::where('tenant_id', $tenantId)->count() > 0) {
            $this->command->info('  Audit logs already exist, skipping...');
            return;
        }

        $logs = [
            ['user_id' => 1, 'user_email' => 'fikri@gestsyndic.ma', 'category' => 'auth', 'action' => 'Auth.login', 'severity' => 'info', 'target_type' => null, 'target_id' => null, 'target_label' => 'Mohammed Fikri', 'ip_address' => '105.66.12.34', 'created_at' => Carbon::now()->subDays(7)->setHour(8)->setMinute(15)],
            ['user_id' => 1, 'user_email' => 'fikri@gestsyndic.ma', 'category' => 'immeuble', 'action' => 'Residence.updated', 'severity' => 'info', 'target_type' => 'Residence', 'target_id' => 1, 'target_label' => 'Résidence Atlas', 'ip_address' => '105.66.12.34', 'created_at' => Carbon::now()->subDays(7)->setHour(9)->setMinute(30)],
            ['user_id' => 2, 'user_email' => 'alaoui@gestsyndic.ma', 'category' => 'coproprietaire', 'action' => 'Coproprietaire.created', 'severity' => 'info', 'target_type' => 'Coproprietaire', 'target_id' => 15, 'target_label' => 'Khalid Bennani', 'ip_address' => '196.12.45.89', 'created_at' => Carbon::now()->subDays(6)->setHour(10)->setMinute(22)],
            ['user_id' => 2, 'user_email' => 'alaoui@gestsyndic.ma', 'category' => 'paiement', 'action' => 'Paiement.created', 'severity' => 'info', 'target_type' => 'Paiement', 'target_id' => 30, 'target_label' => 'Lot A101 · 850,00 DH', 'ip_address' => '196.12.45.89', 'created_at' => Carbon::now()->subDays(6)->setHour(11)->setMinute(45)],
            ['user_id' => 1, 'user_email' => 'fikri@gestsyndic.ma', 'category' => 'paiement', 'action' => 'Paiement.created', 'severity' => 'info', 'target_type' => 'Paiement', 'target_id' => 31, 'target_label' => 'Lot A102 · 1 200,00 DH', 'ip_address' => '105.66.12.34', 'created_at' => Carbon::now()->subDays(5)->setHour(14)->setMinute(10)],
            ['user_id' => 1, 'user_email' => 'fikri@gestsyndic.ma', 'category' => 'budget', 'action' => 'Budget.approved', 'severity' => 'sensitive', 'target_type' => 'Budget', 'target_id' => 1, 'target_label' => 'Budget 2026 — Résidence Atlas', 'ip_address' => '105.66.12.34', 'created_at' => Carbon::now()->subDays(5)->setHour(15)->setMinute(0)],
            ['user_id' => 2, 'user_email' => 'alaoui@gestsyndic.ma', 'category' => 'depense', 'action' => 'Depense.created', 'severity' => 'info', 'target_type' => 'Depense', 'target_id' => 10, 'target_label' => 'Facture nettoyage — 2 400 DH', 'ip_address' => '196.12.45.89', 'created_at' => Carbon::now()->subDays(4)->setHour(9)->setMinute(0)],
            ['user_id' => null, 'user_email' => 'inconnu@fake.com', 'category' => 'auth', 'action' => 'Auth.failed_login', 'severity' => 'warning', 'target_type' => null, 'target_id' => null, 'target_label' => 'Tentative échouée', 'ip_address' => '197.230.45.12', 'created_at' => Carbon::now()->subDays(3)->setHour(3)->setMinute(45)],
            ['user_id' => 1, 'user_email' => 'fikri@gestsyndic.ma', 'category' => 'document', 'action' => 'Document.uploaded', 'severity' => 'info', 'target_type' => 'Document', 'target_id' => 5, 'target_label' => 'PV AG 2025.pdf', 'ip_address' => '105.66.12.34', 'created_at' => Carbon::now()->subDays(3)->setHour(10)->setMinute(30)],
            ['user_id' => 1, 'user_email' => 'fikri@gestsyndic.ma', 'category' => 'coproprietaire', 'action' => 'Coproprietaire.deleted', 'severity' => 'sensitive', 'target_type' => 'Coproprietaire', 'target_id' => 8, 'target_label' => 'Nadia Berrada', 'ip_address' => '105.66.12.34', 'created_at' => Carbon::now()->subDays(2)->setHour(16)->setMinute(20)],
            ['user_id' => 2, 'user_email' => 'alaoui@gestsyndic.ma', 'category' => 'paiement', 'action' => 'Paiement.updated', 'severity' => 'info', 'target_type' => 'Paiement', 'target_id' => 25, 'target_label' => 'Lot A108 · 750,00 DH', 'ip_address' => '196.12.45.89', 'created_at' => Carbon::now()->subDays(2)->setHour(11)->setMinute(0)],
            ['user_id' => 1, 'user_email' => 'fikri@gestsyndic.ma', 'category' => 'ag', 'action' => 'AG.convocation_sent', 'severity' => 'sensitive', 'target_type' => 'Assemblee', 'target_id' => 1, 'target_label' => 'AG Ordinaire 2026', 'ip_address' => '105.66.12.34', 'created_at' => Carbon::now()->subDays(1)->setHour(8)->setMinute(0)],
            ['user_id' => 1, 'user_email' => 'fikri@gestsyndic.ma', 'category' => 'system', 'action' => 'Backup.completed', 'severity' => 'info', 'target_type' => null, 'target_id' => null, 'target_label' => 'Sauvegarde quotidienne', 'ip_address' => '127.0.0.1', 'created_at' => Carbon::now()->subDays(1)->setHour(2)->setMinute(0)],
            ['user_id' => 2, 'user_email' => 'alaoui@gestsyndic.ma', 'category' => 'lot', 'action' => 'Lot.updated', 'severity' => 'info', 'target_type' => 'Lot', 'target_id' => 3, 'target_label' => 'Lot A103 — tantièmes modifiés', 'ip_address' => '196.12.45.89', 'created_at' => Carbon::now()->subHours(6)],
            ['user_id' => 1, 'user_email' => 'fikri@gestsyndic.ma', 'category' => 'auth', 'action' => 'Auth.login', 'severity' => 'info', 'target_type' => null, 'target_id' => null, 'target_label' => 'Mohammed Fikri', 'ip_address' => '105.66.12.34', 'created_at' => Carbon::now()->subHours(2)],
        ];

        foreach ($logs as $log) {
            AuditLog::create(array_merge($log, [
                'tenant_id' => $tenantId,
                'user_agent' => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/125.0',
            ]));
        }

        $this->command->info('  ✓ 15 audit logs created');
    }

    private function seedOccupants(int $tenantId, Residence $residence): void
    {
        if (Occupant::where('tenant_id', $tenantId)->count() > 0) {
            $this->command->info('  Occupants already exist, skipping...');
            return;
        }

        $lots = $residence->lots()->take(10)->get();
        $occupants = [
            ['nom' => 'Hassan Benali', 'telephone' => '+212661000001', 'type' => 'proprietaire_occupant', 'date_debut' => '2020-01-15'],
            ['nom' => 'Ahmed Tazi', 'telephone' => '+212662000002', 'type' => 'locataire', 'date_debut' => '2024-09-01', 'date_fin' => '2026-08-31'],
            ['nom' => 'Fatima Chraibi', 'telephone' => '+212663000003', 'type' => 'proprietaire_occupant', 'date_debut' => '2019-06-01'],
            ['nom' => 'Rachid Bennani', 'telephone' => '+212664000004', 'type' => 'locataire', 'date_debut' => '2025-01-01', 'date_fin' => '2026-12-31'],
            ['nom' => 'Amina Kettani', 'telephone' => '+212665000005', 'type' => 'proprietaire_occupant', 'date_debut' => '2021-03-15'],
            ['nom' => 'Youssef Lahlou', 'telephone' => '+212666000006', 'type' => 'usufruitier', 'date_debut' => '2023-07-01'],
            ['nom' => 'Nadia El Fassi', 'telephone' => '+212667000007', 'type' => 'proprietaire_occupant', 'date_debut' => '2018-09-01'],
            ['nom' => 'Karim Senhaji', 'telephone' => '+212668000008', 'type' => 'locataire', 'date_debut' => '2025-06-01', 'date_fin' => '2027-05-31'],
            ['nom' => 'Souad Filali', 'telephone' => '+212669000009', 'type' => 'proprietaire_occupant', 'date_debut' => '2020-11-01'],
            ['nom' => 'Mehdi Cherkaoui', 'telephone' => '+212660000010', 'type' => 'locataire', 'date_debut' => '2024-03-01', 'date_fin' => '2026-02-28'],
        ];

        foreach ($lots as $i => $lot) {
            if (!isset($occupants[$i])) break;
            $data = $occupants[$i];
            Occupant::create([
                'tenant_id' => $tenantId,
                'lot_id' => $lot->id,
                'coproprietaire_id' => $lot->id, // copro IDs match lot IDs in demo
                'nom' => $data['nom'],
                'telephone' => $data['telephone'],
                'type' => $data['type'],
                'date_debut' => $data['date_debut'],
                'date_fin' => $data['date_fin'] ?? null,
            ]);
        }

        $this->command->info('  ✓ ' . min(count($lots), count($occupants)) . ' occupants created');
    }

    private function seedPenaltyConfig(Residence $residence): void
    {
        if (PenaltyConfig::where('residence_id', $residence->id)->exists()) {
            $this->command->info("  PenaltyConfig for residence #{$residence->id} already exists, skipping...");
            return;
        }

        PenaltyConfig::create([
            'residence_id' => $residence->id,
            'enabled' => true,
            'grace_period_days' => 15,
            'rate_type' => 'percentage',
            'rate_value' => 5.00,
            'cap_max_montant' => 5000.00,
            'ag_approved_at' => Carbon::now()->subMonths(3),
        ]);

        $this->command->info("  ✓ PenaltyConfig for {$residence->name}");
    }

    private function seedComplianceCalendar(Residence $residence): void
    {
        if (ComplianceCalendarTask::where('residence_id', $residence->id)->count() > 0) {
            $this->command->info("  Compliance tasks for residence #{$residence->id} already exist, skipping...");
            return;
        }

        $service = new ComplianceCalendarService();
        $service->seedForExercice($residence->id, 2026);

        // Mark some past months as done for realism
        $now = Carbon::now();
        ComplianceCalendarTask::where('residence_id', $residence->id)
            ->where('exercice', 2026)
            ->where('phase', 'operations_mensuelles')
            ->where('due_date', '<', $now->toDateString())
            ->update([
                'status' => 'done',
                'completed_at' => $now->subDays(3),
                'completed_by' => 1,
            ]);

        $count = ComplianceCalendarTask::where('residence_id', $residence->id)->count();
        $this->command->info("  ✓ {$count} compliance tasks for {$residence->name}");
    }

    private function seedAnnexesCache(Residence $residence): void
    {
        if (AnnexeCache::where('residence_id', $residence->id)->count() > 0) {
            $this->command->info("  AnnexeCache for residence #{$residence->id} already exists, skipping...");
            return;
        }

        $service = new AnnexeGeneratorService();
        $annexes = ['10', '13-1', '13-2'];

        foreach ($annexes as $num) {
            try {
                $service->generate($residence, 2026, $num, 1);
                $this->command->info("  ✓ Annexe {$num} generated for {$residence->name}");
            } catch (\Throwable $e) {
                $this->command->warn("  ✗ Annexe {$num} failed: {$e->getMessage()}");
            }
        }
    }
}
