<?php

namespace Database\Seeders;

use App\Models\AppelFonds;
use App\Models\Budget;
use App\Models\Contrat;
use App\Models\Coproprietaire;
use App\Models\Exercice;
use App\Models\Immeuble;
use App\Models\Lot;
use App\Models\Paiement;
use App\Models\PosteBudgetaire;
use App\Models\Prestataire;
use App\Models\Residence;
use App\Models\Tenant;
use App\Models\Ticket;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Database\Seeder;

/**
 * Demo tenant « TestSyndic » — Résidence AQUALINA, basée sur un vrai devis de
 * prestation de syndic (exercice 2026, 1ère année).
 *
 *   63 appartements (cotisation ~600 DH) + 12 magasins (~300 DH) = 75 lots
 *   Budget annuel 496 800 DH · prestataires démarrés le 01/01/2026
 *   ~7 lots laissés NON assignés (pour tester le filtre lots libres).
 *
 *   php artisan db:seed --class=TestSyndicSeeder
 */
class TestSyndicSeeder extends Seeder
{
    public function run(): void
    {
        if (Tenant::where('subdomain', 'testsyndic')->exists()) {
            $this->command->warn('Tenant « testsyndic » déjà présent — seed ignoré (purge d\'abord).');

            return;
        }

        // ── 1. TENANT ───────────────────────────────────────────────
        $tenant = Tenant::create([
            'name'       => 'TestSyndic',
            'email'      => 'contact@testsyndic.ma',
            'phone'      => '+212522700001',
            'plan'       => 'business',
            'max_logins' => 500,
            'rc'         => 'RC-300055',
            'subdomain'  => 'testsyndic',
            'status'     => 'active',
        ]);
        $t = $tenant->id;
        config(['app.tenant_id' => $t]);

        // ── 2. STAFF ────────────────────────────────────────────────
        $manager = User::create([
            'tenant_id' => $t, 'name' => 'Othmane Bennani',
            'phone' => '+212700000001', 'email' => 'manager@testsyndic.ma',
            'password' => bcrypt('Testsyndic2026'), 'role' => 'manager', 'status' => 'active',
        ]);
        $manager->assignRole('manager');

        $gestionnaire = User::create([
            'tenant_id' => $t, 'name' => 'Sanae Idrissi',
            'phone' => '+212700000002', 'email' => 'gestionnaire@testsyndic.ma',
            'password' => bcrypt('Testsyndic2026'), 'role' => 'gestionnaire', 'status' => 'active',
            'notification_prefs' => ['paiement' => true, 'ticket' => true, 'assemblee' => true, 'retard' => true],
        ]);
        $gestionnaire->assignRole('gestionnaire');

        $conseil = User::create([
            'tenant_id' => $t, 'name' => 'Abdelhak Naciri',
            'phone' => '+212700000003', 'email' => 'conseil@testsyndic.ma',
            'password' => bcrypt('Testsyndic2026'), 'role' => 'conseil', 'status' => 'active',
        ]);
        $conseil->assignRole('conseil');

        // ── 3. RÉSIDENCE AQUALINA (mode tantième, total 1000) ───────
        $residence = Residence::withoutGlobalScope('tenant')->create([
            'tenant_id' => $t, 'gestionnaire_id' => $gestionnaire->id,
            'name' => 'Résidence Aqualina', 'address' => 'Boulevard de l\'Océan, Aïn Diab',
            'city' => 'Casablanca', 'total_tantieme' => 1000, 'mode_cotisation' => 'tantieme',
            'cotisation_mensuelle' => null, 'nb_lots' => 75, 'status' => 'active',
        ]);

        $immeubles = [];
        foreach (['Bloc A', 'Bloc B', 'Bloc C', 'Galerie Commerciale'] as $nom) {
            $immeubles[] = Immeuble::withoutGlobalScope('tenant')->create([
                'tenant_id' => $t, 'residence_id' => $residence->id, 'groupe_habitation_id' => null,
                'nom' => $nom, 'nb_etages' => $nom === 'Galerie Commerciale' ? 1 : 6, 'nb_lots' => 0,
            ]);
        }

        // ── 4. EXERCICES ────────────────────────────────────────────
        Exercice::withoutGlobalScope('tenant')->create([
            'tenant_id' => $t, 'residence_id' => $residence->id, 'annee' => 2025,
            'date_debut' => '2025-01-01', 'date_fin' => '2025-12-31', 'statut' => 'cloture',
        ]);
        $ex = Exercice::withoutGlobalScope('tenant')->create([
            'tenant_id' => $t, 'residence_id' => $residence->id, 'annee' => 2026,
            'date_debut' => '2026-01-01', 'date_fin' => '2026-12-31', 'statut' => 'actif',
        ]);

        // ── 5. LOTS (75) + COPROPRIÉTAIRES (~68, 7 lots libres) ─────
        // Tantièmes = 1000 pile : 34 appart@15 + 29 appart@14 + 12 magasins@7.
        $apptTantiemes = array_merge(array_fill(0, 34, 15), array_fill(0, 29, 14)); // 63

        $prenoms = ['Hamza', 'Salma', 'Yassine', 'Nawal', 'Anas', 'Imane', 'Bilal', 'Hind', 'Marouane', 'Sara',
            'Ayoub', 'Kawtar', 'Zakaria', 'Meryem', 'Ilyas', 'Asma', 'Soufiane', 'Loubna', 'Achraf', 'Dounia',
            'Nabil', 'Fadwa', 'Walid', 'Siham', 'Othmane', 'Rim', 'Hicham', 'Ghizlane', 'Karim', 'Btissam'];
        $noms = ['El Khattabi', 'Berrada', 'Sebti', 'Lahlou', 'Bennis', 'Chraibi', 'Tazi', 'Alaoui', 'Bargach',
            'Skalli', 'Lamrani', 'Benkirane', 'Fihri', 'Guessous', 'Cherkaoui', 'Belghiti', 'Sefrioui', 'Kadiri'];

        // 7 lots laissés vacants (mix appart + magasins).
        $vacants = [12, 33, 58, 70, 71, 73, 74];

        $lots = [];
        $copros = [];
        $resCount = 0;
        for ($i = 0; $i < 75; $i++) {
            $isMagasin = $i >= 63;
            $localIdx = $isMagasin ? $i - 63 : $i;
            if ($isMagasin) {
                $immeuble = $immeubles[3];
                $numero = 'M'.($localIdx + 1);
                $etage = 0;
                $tantieme = 7;
                $type = 'local_commercial';
            } else {
                $blocIdx = intdiv($localIdx, 21);           // 0,1,2 → Bloc A/B/C
                $immeuble = $immeubles[$blocIdx];
                $numero = ['A', 'B', 'C'][$blocIdx].(($localIdx % 21) + 1);
                $etage = intdiv($localIdx % 21, 4) + 1;
                $tantieme = $apptTantiemes[$localIdx];
                $type = 'appartement';
            }

            $lot = Lot::withoutGlobalScope('tenant')->create([
                'tenant_id' => $t, 'residence_id' => $residence->id, 'immeuble_id' => $immeuble->id,
                'numero' => $numero, 'etage' => $etage, 'type' => $type,
                'superficie' => $isMagasin ? rand(25, 80) : rand(60, 140), 'tantieme' => $tantieme,
            ]);
            $lots[] = $lot;

            if (in_array($i, $vacants, true)) {
                continue; // lot libre
            }

            $name = $prenoms[$resCount % count($prenoms)].' '.$noms[($resCount * 5 + 3) % count($noms)];
            $user = User::create([
                'tenant_id' => $t, 'name' => $name,
                'phone' => '+21277'.str_pad((string) ($resCount + 1), 7, '0', STR_PAD_LEFT),
                'email' => 'copro'.($resCount + 1).'@aqualina-demo.ma',
                'role' => 'resident', 'status' => 'active', 'password' => bcrypt('resident2026'),
            ]);
            $user->assignRole('resident');

            $copro = Coproprietaire::create([
                'tenant_id' => $t, 'user_id' => $user->id, 'lot_id' => $lot->id,
                'type' => $isMagasin ? 'locataire' : 'proprietaire',
                'date_entree' => '2026-01-01', 'solde_actuel' => 0,
            ]);
            $copros[] = $copro;
            $resCount++;
        }

        // ── 6. PRESTATAIRES (du devis) ──────────────────────────────
        $prestaDefs = [
            ['Atlas Sécurité Privée', '+212522700010', 'securite'],
            ['ProNet Ménage Casa', '+212522700011', 'nettoyage'],
            ['Otis Maroc Ascenseurs', '+212522700012', 'ascenseur'],
            ['AquaPiscine Services', '+212522700013', 'piscine'],
            ['Jardins Verts SARL', '+212522700014', 'espaces_verts'],
            ['Hygiène 3D Maroc', '+212522700015', 'desinsectisation'],
            ['Wiqaya Assurances', '+212522700016', 'assurance'],
        ];
        $presta = [];
        foreach ($prestaDefs as $j => $d) {
            $presta[] = Prestataire::create([
                'tenant_id' => $t, 'nom' => $d[0], 'telephone' => $d[1],
                'email' => 'contact'.($j + 1).'@'.strtolower(str_replace(' ', '', $d[0])).'.ma',
                'specialite' => $d[2], 'note_moyenne' => round(rand(35, 49) / 10, 1),
                'nb_interventions' => rand(2, 20), 'statut' => 'actif',
            ]);
        }

        // ── 7. CONTRATS (démarrés le 01/01/2026) ────────────────────
        $contratDefs = [
            [0, 'Gardiennage 7/7 jour & nuit — Aqualina', 'gardiennage', 211200],
            [1, 'Nettoyage parties communes 6/7', 'nettoyage', 96000],
            [2, 'Maintenance ascenseurs (4 cabines)', 'ascenseur', 16800],
            [3, 'Entretien piscine', 'maintenance', 8400],
            [4, 'Entretien espaces verts', 'maintenance', 6000],
            [5, 'Traitement 3D (désinsectisation)', 'maintenance', 4800],
            [6, 'Assurance multirisque parties communes', 'autre', 6000],
        ];
        foreach ($contratDefs as $c) {
            Contrat::create([
                'tenant_id' => $t, 'residence_id' => $residence->id, 'prestataire_id' => $presta[$c[0]]->id,
                'titre' => $c[1], 'type' => $c[2], 'montant' => $c[3],
                'date_debut' => '2026-01-01', 'date_fin' => '2026-12-31',
                'statut' => 'actif', 'renouvellement_auto' => true,
            ]);
        }

        // ── 8. BUDGET 2026 (postes = 496 800 DH pile) ───────────────
        $budget = Budget::create([
            'tenant_id' => $t, 'residence_id' => $residence->id, 'exercice_id' => $ex->id,
            'statut' => 'approuve', 'approuve_at' => '2026-01-15',
        ]);
        $postes = [
            ['gardiennage', 'Sécurité jour + nuit 7/7 (4 agents)', 211200],
            ['nettoyage', 'Femmes de ménage 6/7 (2)', 96000],
            ['entretien', 'Agent polyvalent balayeur & jardinier 6/7', 54000],
            ['entretien', 'Maintenance ascenseurs (4 cabines)', 16800],
            ['entretien', 'Entretien piscine', 8400],
            ['entretien', 'Entretien espaces verts', 6000],
            ['entretien', 'Consommation eau & électricité communes', 14400],
            ['entretien', 'Produits de nettoyage', 6000],
            ['entretien', 'Traitement 3D (désinsectisation)', 4800],
            ['assurance', 'Assurance multirisque parties communes', 6000],
            ['administratif', 'Honoraires de syndic', 50400],
            ['administratif', 'Frais bancaires', 1200],
            ['administratif', 'Honoraires huissier — AG annuelles', 1500],
            ['administratif', 'Organisation AG annuelle', 1500],
            ['autre', 'Compte de réserves', 18600],
        ];
        foreach ($postes as $p) {
            PosteBudgetaire::create([
                'budget_id' => $budget->id, 'categorie' => $p[0], 'description' => $p[1],
                'montant_prevu' => $p[2], 'montant_realise' => round($p[2] * 0.45, 2),
            ]);
        }

        // ── 9. APPELS DE FONDS + PAIEMENTS ──────────────────────────
        $modes = ['virement', 'cheque', 'especes', 'virement', 'virement'];

        // Q1 2026 — soldé
        $q1 = AppelFonds::withoutGlobalScope('tenant')->create([
            'tenant_id' => $t, 'residence_id' => $residence->id, 'exercice_id' => $ex->id,
            'created_by' => $gestionnaire->id, 'libelle' => 'Charges trimestrielles Q1 2026',
            'description' => 'Gardiennage, ménage, ascenseurs, piscine, espaces verts (jan-mars)',
            'montant_total' => 124200, 'date_echeance' => Carbon::parse('2026-03-31'),
            'statut' => 'solde', 'sent_at' => Carbon::parse('2026-01-05'),
        ]);
        $q1->genererLignes();
        foreach ($q1->lignes()->with('coproprietaire')->get() as $i => $ligne) {
            Paiement::create([
                'tenant_id' => $t, 'exercice_id' => $ex->id, 'coproprietaire_id' => $ligne->coproprietaire_id,
                'appel_fonds_ligne_id' => $ligne->id, 'saisi_par' => $gestionnaire->id,
                'montant' => $ligne->montant_du, 'mode' => $modes[$i % count($modes)],
                'reference' => 'PAY-AQ-2026-'.str_pad((string) ($i + 1), 4, '0', STR_PAD_LEFT),
                'date_paiement' => Carbon::parse('2026-0'.rand(1, 3).'-'.rand(5, 28)),
            ]);
            $ligne->update(['montant_paye' => $ligne->montant_du, 'statut' => 'paye', 'date_paiement' => Carbon::parse('2026-03-15')]);
            $ligne->coproprietaire->recalculerSolde();
        }

        // Q2 2026 — partiel (la plupart payés, quelques partiels + impayés)
        $q2 = AppelFonds::withoutGlobalScope('tenant')->create([
            'tenant_id' => $t, 'residence_id' => $residence->id, 'exercice_id' => $ex->id,
            'created_by' => $gestionnaire->id, 'libelle' => 'Charges trimestrielles Q2 2026',
            'description' => 'Gardiennage, ménage, ascenseurs, piscine, espaces verts (avr-juin)',
            'montant_total' => 124200, 'date_echeance' => Carbon::parse('2026-06-30'),
            'statut' => 'envoye', 'sent_at' => Carbon::parse('2026-04-01'),
        ]);
        $q2->genererLignes();
        $lignesQ2 = $q2->lignes()->with('coproprietaire')->get();
        $nbFull = max(1, $lignesQ2->count() - 13);
        foreach ($lignesQ2->take($nbFull) as $i => $ligne) {
            Paiement::create([
                'tenant_id' => $t, 'exercice_id' => $ex->id, 'coproprietaire_id' => $ligne->coproprietaire_id,
                'appel_fonds_ligne_id' => $ligne->id, 'saisi_par' => $gestionnaire->id,
                'montant' => $ligne->montant_du, 'mode' => $modes[$i % count($modes)],
                'reference' => 'PAY-AQ-2026-'.str_pad((string) ($i + 200), 4, '0', STR_PAD_LEFT),
                'date_paiement' => now()->subDays(rand(5, 40)),
            ]);
            $ligne->update(['montant_paye' => $ligne->montant_du, 'statut' => 'paye']);
            $ligne->coproprietaire->recalculerSolde();
        }
        foreach ($lignesQ2->skip($nbFull)->take(5) as $ligne) {
            $partiel = round($ligne->montant_du * 0.5, 2);
            Paiement::create([
                'tenant_id' => $t, 'exercice_id' => $ex->id, 'coproprietaire_id' => $ligne->coproprietaire_id,
                'appel_fonds_ligne_id' => $ligne->id, 'saisi_par' => $gestionnaire->id,
                'montant' => $partiel, 'mode' => 'especes',
                'reference' => 'PAY-AQ-PART-'.str_pad((string) $ligne->id, 3, '0', STR_PAD_LEFT),
                'date_paiement' => now()->subDays(8),
            ]);
            $ligne->update(['montant_paye' => $partiel, 'statut' => 'partiel']);
            $ligne->coproprietaire->recalculerSolde();
        }
        foreach ($lignesQ2->skip($nbFull + 5) as $ligne) {
            $ligne->coproprietaire->recalculerSolde();
        }
        $q2->update(['statut' => 'partiel']);

        // ── 10. TICKETS ─────────────────────────────────────────────
        $ticketDefs = [
            ['ascenseur', 'urgent', 'ouvert', 'Ascenseur du Bloc B bloqué entre le 3e et le 4e étage depuis hier soir.'],
            ['plomberie', 'normal', 'en_cours', 'Fuite d\'eau dans le parking sous-sol, près de la place 12.'],
            ['proprete', 'faible', 'resolu', 'Encombrants laissés dans le hall du Bloc A.'],
            ['securite', 'urgent', 'ouvert', 'Portail d\'entrée principal ne se verrouille plus correctement la nuit.'],
        ];
        foreach ($ticketDefs as $k => $d) {
            $copro = $copros[$k * 7 % count($copros)];
            Ticket::create([
                'tenant_id' => $t, 'residence_id' => $residence->id,
                'user_id' => $copro->user_id, 'lot_id' => $copro->lot_id,
                'categorie' => $d[0], 'priorite' => $d[1], 'statut' => $d[2], 'description' => $d[3],
            ]);
        }

        $this->command->info("✅ TestSyndic seedé : 75 lots, {$resCount} copros (".(75 - $resCount).' libres), budget 496 800 DH, exercice 2026.');
        $this->command->info('   Manager : manager@testsyndic.ma / Testsyndic2026');
    }
}
