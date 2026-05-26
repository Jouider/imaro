<?php

namespace Database\Seeders;

use App\Models\Annonce;
use App\Models\AppelFonds;
use App\Models\Assemblee;
use App\Models\AuditLog;
use App\Models\AutreRecette;
use App\Models\BilanOuvertureLigne;
use App\Models\Budget;
use App\Models\ComplianceCalendarTask;
use App\Models\Contrat;
use App\Models\Coproprietaire;
use App\Models\Depense;
use App\Models\Document;
use App\Models\Emprunt;
use App\Models\Equipement;
use App\Models\Exercice;
use App\Models\GroupeHabitation;
use App\Models\Immeuble;
use App\Models\Lot;
use App\Models\Notification;
use App\Models\Occupant;
use App\Models\Paiement;
use App\Models\PenaltyConfig;
use App\Models\PointageLineMatch;
use App\Models\PointageSession;
use App\Models\PosteBudgetaire;
use App\Models\Prestataire;
use App\Models\Remboursement;
use App\Models\Residence;
use App\Models\Tenant;
use App\Models\Ticket;
use App\Models\TravauxExceptionnel;
use App\Models\User;
use App\Services\ComplianceCalendarService;
use Carbon\Carbon;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class FullDemoSeeder extends Seeder
{
    private int $t;
    private Tenant $tenant;

    public function run(): void
    {
        $this->command->info('');
        $this->command->info('  ╔══════════════════════════════════════════╗');
        $this->command->info('  ║   IMARO — Full Demo Seeder              ║');
        $this->command->info('  ║   All modules + accounting data         ║');
        $this->command->info('  ╚══════════════════════════════════════════╝');
        $this->command->info('');

        // ════════════════════════════════════════════════════════════
        // 1. TENANT
        // ════════════════════════════════════════════════════════════
        $this->tenant = Tenant::create([
            'name'       => 'Blanca Syndic',
            'email'      => 'contact@blancasyndic.ma',
            'phone'      => '+212522000001',
            'plan'       => 'business',
            'max_logins' => 500,
            'rc'         => 'RC-122735',
            'subdomain'  => 'blanca',
            'status'     => 'active',
        ]);
        $this->t = $this->tenant->id;
        config(['app.tenant_id' => $this->t]);

        $this->command->info('  ✓ Tenant: Blanca Syndic');

        // ════════════════════════════════════════════════════════════
        // 2. USERS
        // ════════════════════════════════════════════════════════════
        $pwd = Hash::make('imaro2026');

        $manager = $this->createUser('Mohammed Fikri', '+212600000001', 'fikri@blancasyndic.ma', 'manager', $pwd);
        $g1 = $this->createUser('Karim Alaoui', '+212600000002', 'alaoui@blancasyndic.ma', 'gestionnaire', $pwd, ['paiement' => true, 'ticket' => true, 'assemblee' => true, 'retard' => true]);
        $g2 = $this->createUser('Leila Mansouri', '+212600000003', 'mansouri@blancasyndic.ma', 'gestionnaire', $pwd, ['paiement' => true, 'ticket' => true, 'assemblee' => false, 'retard' => true]);
        $conseil = $this->createUser('Driss El Fassi', '+212600000004', 'elfassi@email.ma', 'conseil', $pwd);

        $this->command->info('  ✓ 4 staff users (manager + 2 gestionnaires + conseil)');

        // ════════════════════════════════════════════════════════════
        // 3. RÉSIDENCES + IMMEUBLES
        // ════════════════════════════════════════════════════════════
        $r1 = Residence::withoutGlobalScope('tenant')->create([
            'tenant_id' => $this->t, 'gestionnaire_id' => $g1->id,
            'name' => 'Résidence Atlas', 'address' => '12 Boulevard Zerktouni, Maârif',
            'city' => 'Casablanca', 'total_tantieme' => 1000, 'mode_cotisation' => 'tantieme',
            'cotisation_mensuelle' => null, 'nb_lots' => 20, 'status' => 'active',
        ]);
        $ghA1 = GroupeHabitation::withoutGlobalScope('tenant')->create([
            'tenant_id' => $this->t, 'residence_id' => $r1->id,
            'nom' => 'Tranche A', 'description' => 'Bâtiment principal — 16 appartements', 'total_tantieme' => 780,
        ]);
        $ghA2 = GroupeHabitation::withoutGlobalScope('tenant')->create([
            'tenant_id' => $this->t, 'residence_id' => $r1->id,
            'nom' => 'Tranche B', 'description' => 'Aile secondaire — 4 lots', 'total_tantieme' => 220,
        ]);
        $immA = Immeuble::withoutGlobalScope('tenant')->create([
            'tenant_id' => $this->t, 'residence_id' => $r1->id, 'groupe_habitation_id' => $ghA1->id,
            'nom' => 'Immeuble A', 'nb_etages' => 5, 'nb_lots' => 16,
        ]);
        $immB = Immeuble::withoutGlobalScope('tenant')->create([
            'tenant_id' => $this->t, 'residence_id' => $r1->id, 'groupe_habitation_id' => $ghA2->id,
            'nom' => 'Immeuble B', 'nb_etages' => 2, 'nb_lots' => 4,
        ]);

        $r2 = Residence::withoutGlobalScope('tenant')->create([
            'tenant_id' => $this->t, 'gestionnaire_id' => $g2->id,
            'name' => 'Résidence Anfa Gardens', 'address' => '45 Rue des Palmiers, Anfa',
            'city' => 'Casablanca', 'total_tantieme' => 1000, 'mode_cotisation' => 'fixe',
            'cotisation_mensuelle' => 2500, 'nb_lots' => 10, 'status' => 'active',
        ]);
        $immAnfa = Immeuble::withoutGlobalScope('tenant')->create([
            'tenant_id' => $this->t, 'residence_id' => $r2->id, 'groupe_habitation_id' => null,
            'nom' => 'Immeuble Anfa', 'nb_etages' => 4, 'nb_lots' => 10,
        ]);

        $this->command->info('  ✓ 2 résidences (Atlas 20 lots + Anfa 10 lots)');

        // ════════════════════════════════════════════════════════════
        // 4. EXERCICES
        // ════════════════════════════════════════════════════════════
        $ex2025 = $this->createExercice($r1->id, 2025, 'cloture');
        $ex2026 = $this->createExercice($r1->id, 2026, 'actif');
        $exAnfa = $this->createExercice($r2->id, 2026, 'actif');

        $this->command->info('  ✓ 3 exercices (Atlas 2025 clôturé + 2026 actif, Anfa 2026 actif)');

        // ════════════════════════════════════════════════════════════
        // 5. LOTS + COPROPRIÉTAIRES — Résidence Atlas
        // ════════════════════════════════════════════════════════════
        $nomsAtlas = [
            'Hassan Benali', 'Fatima Chraibi', 'Youssef Tazi', 'Nadia Berrada',
            'Omar Fassi', 'Amina Kettani', 'Rachid Squalli', 'Houda Lahlou',
            'Mehdi Bensouda', 'Souad El Amrani', 'Khalid Bennani', 'Zineb Tahiri',
            'Samir Cherkaoui', 'Khadija Benhaddou', 'Adil Ziani', 'Meriem Ouazzani',
            'Tariq Lamrani', 'Hafida Ghazi', 'Younes Sabri', 'Rajaa Filali',
        ];
        $tantiemesAtlas = [65, 55, 50, 50, 50, 50, 50, 50, 50, 50, 50, 50, 50, 50, 50, 50, 45, 45, 45, 45];
        $typesLot = ['appartement', 'appartement', 'appartement', 'local_commercial', 'appartement'];

        $coprosAtlas = [];
        foreach ($nomsAtlas as $i => $nom) {
            $imm = $i < 16 ? $immA : $immB;
            $lot = Lot::withoutGlobalScope('tenant')->create([
                'tenant_id' => $this->t, 'residence_id' => $r1->id, 'immeuble_id' => $imm->id,
                'numero' => $i < 16 ? 'A'.($i + 101) : 'B'.($i - 15),
                'etage' => (int) floor($i / 4) + 1, 'type' => $typesLot[$i % count($typesLot)],
                'superficie' => rand(55, 130), 'tantieme' => $tantiemesAtlas[$i],
            ]);

            $user = $this->createUser($nom, '+21266'.str_pad($i + 10, 7, '0', STR_PAD_LEFT),
                strtolower(str_replace(' ', '.', $nom)).'@email.ma', 'resident', Hash::make('resident2026'));

            $copro = Coproprietaire::create([
                'tenant_id' => $this->t, 'user_id' => $user->id, 'lot_id' => $lot->id,
                'type' => $i < 17 ? 'proprietaire' : 'locataire',
                'date_entree' => now()->subMonths(rand(6, 36)), 'solde_actuel' => 0,
            ]);
            $coprosAtlas[] = compact('copro', 'lot', 'user');
        }

        // Résidence Anfa
        $nomsAnfa = [
            'Amine Benjelloun', 'Salma Touzani', 'Hamza El Idrissi', 'Layla Senhaji',
            'Mustapha Alami', 'Ghita Bouzid', 'Reda Chafik', 'Imane Kabbaj',
            'Tarik El Ouardi', 'Samira Hassani',
        ];
        $tantiemesAnfa = [120, 110, 100, 100, 100, 100, 90, 90, 100, 90];

        $coprosAnfa = [];
        foreach ($nomsAnfa as $i => $nom) {
            $lot = Lot::withoutGlobalScope('tenant')->create([
                'tenant_id' => $this->t, 'residence_id' => $r2->id, 'immeuble_id' => $immAnfa->id,
                'numero' => 'C'.($i + 201), 'etage' => (int) floor($i / 3) + 1,
                'type' => $i === 9 ? 'local_commercial' : 'appartement',
                'superficie' => rand(75, 160), 'tantieme' => $tantiemesAnfa[$i],
            ]);

            $user = $this->createUser($nom, '+21267'.str_pad($i + 30, 7, '0', STR_PAD_LEFT),
                strtolower(str_replace(' ', '.', $nom)).'@email.ma', 'resident', Hash::make('resident2026'));

            $copro = Coproprietaire::create([
                'tenant_id' => $this->t, 'user_id' => $user->id, 'lot_id' => $lot->id,
                'type' => 'proprietaire', 'date_entree' => now()->subMonths(rand(3, 24)), 'solde_actuel' => 0,
            ]);
            $coprosAnfa[] = compact('copro', 'lot', 'user');
        }

        $this->command->info('  ✓ 30 lots + 30 copropriétaires (20 Atlas + 10 Anfa)');

        // ════════════════════════════════════════════════════════════
        // 6. PRESTATAIRES
        // ════════════════════════════════════════════════════════════
        $prestataires = [];
        $prestData = [
            ['nom' => 'Atlas Ascenseurs SARL', 'tel' => '+212522334455', 'email' => 'contact@atlasascenseurs.ma', 'specialite' => 'ascenseur', 'note' => 4.2, 'nb' => 12, 'statut' => 'actif'],
            ['nom' => 'ProClean Services', 'tel' => '+212661778899', 'email' => 'info@proclean.ma', 'specialite' => 'nettoyage', 'note' => 3.8, 'nb' => 24, 'statut' => 'actif'],
            ['nom' => 'Bab Plomberie & Chauffage', 'tel' => '+212600556677', 'email' => 'bab.plomberie@gmail.com', 'specialite' => 'plomberie', 'note' => 4.5, 'nb' => 8, 'statut' => 'actif'],
            ['nom' => 'Garde Sécurité Maroc', 'tel' => '+212522889900', 'email' => 'rh@gardesecurite.ma', 'specialite' => 'gardiennage', 'note' => 4.0, 'nb' => 36, 'statut' => 'actif'],
            ['nom' => 'Jardins du Sud', 'tel' => '+212661223344', 'email' => 'contact@jardinsdusud.ma', 'specialite' => 'espaces_verts', 'note' => 3.5, 'nb' => 6, 'statut' => 'inactif'],
            ['nom' => 'Kahraba Express', 'tel' => '+212661990011', 'email' => 'kahraba.express@gmail.com', 'specialite' => 'electricite', 'note' => 4.3, 'nb' => 15, 'statut' => 'actif'],
            ['nom' => 'Wiqaya Assurance', 'tel' => '+212522445566', 'email' => 'syndic@wiqaya.ma', 'specialite' => 'assurance', 'note' => 4.0, 'nb' => 2, 'statut' => 'actif'],
        ];

        foreach ($prestData as $p) {
            $prestataires[] = Prestataire::create([
                'tenant_id' => $this->t, 'nom' => $p['nom'], 'telephone' => $p['tel'],
                'email' => $p['email'], 'specialite' => $p['specialite'],
                'note_moyenne' => $p['note'], 'nb_interventions' => $p['nb'], 'statut' => $p['statut'],
            ]);
        }

        $this->command->info('  ✓ 7 prestataires');

        // ════════════════════════════════════════════════════════════
        // 7. CONTRATS
        // ════════════════════════════════════════════════════════════
        $contratsData = [
            ['res' => $r1->id, 'prest' => 3, 'titre' => 'Gardiennage Résidence Atlas 2026', 'type' => 'gardiennage', 'montant' => 60000, 'debut' => '2026-01-01', 'fin' => '2026-12-31', 'statut' => 'actif', 'renouv' => true],
            ['res' => $r1->id, 'prest' => 1, 'titre' => 'Nettoyage parties communes Atlas', 'type' => 'nettoyage', 'montant' => 36000, 'debut' => '2026-01-01', 'fin' => '2026-12-31', 'statut' => 'actif', 'renouv' => true],
            ['res' => $r1->id, 'prest' => 0, 'titre' => 'Maintenance ascenseur Atlas', 'type' => 'maintenance', 'montant' => 24000, 'debut' => '2026-03-01', 'fin' => '2027-02-28', 'statut' => 'actif', 'renouv' => false],
            ['res' => $r1->id, 'prest' => 4, 'titre' => 'Entretien jardin Atlas (expiré)', 'type' => 'autre', 'montant' => 18000, 'debut' => '2025-06-01', 'fin' => '2026-05-31', 'statut' => 'expire', 'renouv' => false],
            ['res' => $r1->id, 'prest' => 6, 'titre' => 'Assurance multirisque Atlas', 'type' => 'autre', 'montant' => 8000, 'debut' => '2026-01-01', 'fin' => '2026-12-31', 'statut' => 'actif', 'renouv' => true],
            ['res' => $r2->id, 'prest' => 3, 'titre' => 'Gardiennage Anfa Gardens 2026', 'type' => 'gardiennage', 'montant' => 48000, 'debut' => '2026-01-01', 'fin' => '2026-12-31', 'statut' => 'actif', 'renouv' => true],
            ['res' => $r2->id, 'prest' => 5, 'titre' => 'Maintenance électrique Anfa', 'type' => 'maintenance', 'montant' => 15000, 'debut' => '2026-04-01', 'fin' => '2026-09-30', 'statut' => 'actif', 'renouv' => false],
        ];

        foreach ($contratsData as $c) {
            Contrat::create([
                'tenant_id' => $this->t, 'residence_id' => $c['res'], 'prestataire_id' => $prestataires[$c['prest']]->id,
                'titre' => $c['titre'], 'type' => $c['type'], 'montant' => $c['montant'],
                'date_debut' => $c['debut'], 'date_fin' => $c['fin'], 'statut' => $c['statut'],
                'renouvellement_auto' => $c['renouv'],
            ]);
        }

        $this->command->info('  ✓ 7 contrats');

        // ════════════════════════════════════════════════════════════
        // 8. BUDGETS + POSTES
        // ════════════════════════════════════════════════════════════
        $budgetAtlas = Budget::create([
            'tenant_id' => $this->t, 'residence_id' => $r1->id, 'exercice_id' => $ex2026->id,
            'statut' => 'approuve', 'approuve_at' => '2026-01-15',
        ]);
        $postesAtlas = [
            ['categorie' => 'gardiennage',   'description' => 'Salaire gardien + charges sociales',       'montant_prevu' => 60000, 'montant_realise' => 25000],
            ['categorie' => 'nettoyage',     'description' => 'Nettoyage parties communes bi-hebdo',      'montant_prevu' => 36000, 'montant_realise' => 15000],
            ['categorie' => 'entretien',     'description' => 'Contrat maintenance ascenseur Schindler',  'montant_prevu' => 24000, 'montant_realise' => 10000],
            ['categorie' => 'entretien',     'description' => 'Éclairage parties communes + ampoules',    'montant_prevu' => 18000, 'montant_realise' => 7500],
            ['categorie' => 'entretien',     'description' => 'Consommation eau commune (LYDEC)',         'montant_prevu' => 14000, 'montant_realise' => 6200],
            ['categorie' => 'entretien',     'description' => 'Consommation électricité (LYDEC)',         'montant_prevu' => 10000, 'montant_realise' => 4300],
            ['categorie' => 'assurance',     'description' => 'Assurance multirisque immeuble (Wiqaya)',  'montant_prevu' => 8000,  'montant_realise' => 8000],
            ['categorie' => 'administratif', 'description' => 'Honoraires syndic + frais courrier',       'montant_prevu' => 12000, 'montant_realise' => 5000],
            ['categorie' => 'travaux',       'description' => 'Ravalement façade (prévu été 2026)',       'montant_prevu' => 25000, 'montant_realise' => 0],
            ['categorie' => 'autre',         'description' => 'Imprévus et divers',                       'montant_prevu' => 5000,  'montant_realise' => 1800],
        ];
        foreach ($postesAtlas as $p) {
            PosteBudgetaire::create(array_merge($p, ['budget_id' => $budgetAtlas->id]));
        }

        $budgetAnfa = Budget::create([
            'tenant_id' => $this->t, 'residence_id' => $r2->id, 'exercice_id' => $exAnfa->id,
            'statut' => 'brouillon',
        ]);
        $postesAnfa = [
            ['categorie' => 'gardiennage', 'description' => 'Gardiennage 24h/24',           'montant_prevu' => 48000, 'montant_realise' => 0],
            ['categorie' => 'nettoyage',   'description' => 'Nettoyage + désinfection hebdo','montant_prevu' => 24000, 'montant_realise' => 0],
            ['categorie' => 'entretien',   'description' => 'Maintenance piscine',           'montant_prevu' => 18000, 'montant_realise' => 0],
            ['categorie' => 'entretien',   'description' => 'Espaces verts',                 'montant_prevu' => 12000, 'montant_realise' => 0],
            ['categorie' => 'assurance',   'description' => 'Assurance multirisque',         'montant_prevu' => 6000,  'montant_realise' => 0],
        ];
        foreach ($postesAnfa as $p) {
            PosteBudgetaire::create(array_merge($p, ['budget_id' => $budgetAnfa->id]));
        }

        $this->command->info('  ✓ 2 budgets (Atlas approuvé + Anfa brouillon)');

        // ════════════════════════════════════════════════════════════
        // 9. APPELS DE FONDS + PAIEMENTS
        // ════════════════════════════════════════════════════════════
        $modes = ['virement', 'cheque', 'especes', 'virement', 'virement'];

        // Q1 Atlas — fully paid
        $appelQ1 = $this->createAppelFonds($r1->id, $ex2026->id, $g1->id, 'Charges trimestrielles Q1 2026',
            'Charges communes : gardiennage, ascenseur, nettoyage, LYDEC (jan-mars)', 15000, '2026-03-31', 'solde', '2026-01-05');
        $appelQ1->genererLignes();
        foreach ($appelQ1->lignes()->with('coproprietaire')->get() as $i => $ligne) {
            Paiement::create([
                'tenant_id' => $this->t, 'exercice_id' => $ex2026->id,
                'coproprietaire_id' => $ligne->coproprietaire_id, 'appel_fonds_ligne_id' => $ligne->id,
                'saisi_par' => $g1->id, 'montant' => $ligne->montant_du, 'mode' => $modes[$i % 5],
                'reference' => 'PAY-2026-'.str_pad($i + 1, 4, '0', STR_PAD_LEFT),
                'date_paiement' => Carbon::parse('2026-0'.rand(1, 3).'-'.rand(5, 28)),
            ]);
            $ligne->update(['montant_paye' => $ligne->montant_du, 'statut' => 'paye', 'date_paiement' => now()->subDays(rand(30, 90))]);
            $ligne->coproprietaire->recalculerSolde();
        }

        // Q2 Atlas — partial
        $appelQ2 = $this->createAppelFonds($r1->id, $ex2026->id, $g1->id, 'Charges trimestrielles Q2 2026',
            'Charges communes : gardiennage, ascenseur, nettoyage, LYDEC (avr-juin)', 18000, '2026-06-30', 'envoye', '2026-04-01');
        $appelQ2->genererLignes();
        $lignesQ2 = $appelQ2->lignes()->with('coproprietaire')->get();
        foreach ($lignesQ2->take(15) as $i => $ligne) {
            Paiement::create([
                'tenant_id' => $this->t, 'exercice_id' => $ex2026->id,
                'coproprietaire_id' => $ligne->coproprietaire_id, 'appel_fonds_ligne_id' => $ligne->id,
                'saisi_par' => $g1->id, 'montant' => $ligne->montant_du, 'mode' => $modes[$i % 5],
                'reference' => 'PAY-2026-'.str_pad($i + 21, 4, '0', STR_PAD_LEFT),
                'date_paiement' => now()->subDays(rand(5, 30)),
            ]);
            $ligne->update(['montant_paye' => $ligne->montant_du, 'statut' => 'paye', 'date_paiement' => now()->subDays(rand(5, 30))]);
            $ligne->coproprietaire->recalculerSolde();
        }
        foreach ($lignesQ2->skip(15)->take(2) as $ligne) {
            $partial = round($ligne->montant_du * 0.4, 2);
            Paiement::create([
                'tenant_id' => $this->t, 'exercice_id' => $ex2026->id,
                'coproprietaire_id' => $ligne->coproprietaire_id, 'appel_fonds_ligne_id' => $ligne->id,
                'saisi_par' => $g1->id, 'montant' => $partial, 'mode' => 'especes',
                'reference' => 'PAY-2026-PART-'.str_pad($ligne->id, 3, '0', STR_PAD_LEFT),
                'date_paiement' => now()->subDays(10),
            ]);
            $ligne->update(['montant_paye' => $partial, 'statut' => 'partiel']);
            $ligne->coproprietaire->recalculerSolde();
        }
        foreach ($lignesQ2->skip(17) as $ligne) {
            $ligne->coproprietaire->recalculerSolde();
        }
        $appelQ2->update(['statut' => 'partiel']);

        // Anfa — partial
        $appelAnfa = $this->createAppelFonds($r2->id, $exAnfa->id, $g2->id, 'Charges semestrielles S1 2026 — Anfa',
            'Gardiennage, nettoyage, piscine, espaces verts (jan-juin)', 25000, '2026-06-30', 'envoye', '2026-01-10');
        $appelAnfa->genererLignes();
        $lignesAnfa = $appelAnfa->lignes()->with('coproprietaire')->get();
        foreach ($lignesAnfa->take(7) as $i => $ligne) {
            Paiement::create([
                'tenant_id' => $this->t, 'exercice_id' => $exAnfa->id,
                'coproprietaire_id' => $ligne->coproprietaire_id, 'appel_fonds_ligne_id' => $ligne->id,
                'saisi_par' => $g2->id, 'montant' => $ligne->montant_du, 'mode' => $modes[$i % 5],
                'reference' => 'PAY-ANFA-'.str_pad($i + 1, 4, '0', STR_PAD_LEFT),
                'date_paiement' => now()->subDays(rand(10, 50)),
            ]);
            $ligne->update(['montant_paye' => $ligne->montant_du, 'statut' => 'paye']);
            $ligne->coproprietaire->recalculerSolde();
        }
        foreach ($lignesAnfa->skip(7) as $ligne) {
            $ligne->coproprietaire->recalculerSolde();
        }
        $appelAnfa->update(['statut' => 'partiel']);

        $this->command->info('  ✓ 3 appels de fonds + ~42 paiements');

        // ════════════════════════════════════════════════════════════
        // 10. DÉPENSES
        // ════════════════════════════════════════════════════════════
        $depensesData = [
            ['desc' => 'Salaire gardien — janvier',          'cat' => 'gardiennage',   'montant' => 5000,  'date' => '2026-01-31', 'prest' => 3, 'statut' => 'paye'],
            ['desc' => 'Salaire gardien — février',          'cat' => 'gardiennage',   'montant' => 5000,  'date' => '2026-02-28', 'prest' => 3, 'statut' => 'paye'],
            ['desc' => 'Salaire gardien — mars',             'cat' => 'gardiennage',   'montant' => 5000,  'date' => '2026-03-31', 'prest' => 3, 'statut' => 'paye'],
            ['desc' => 'Salaire gardien — avril',            'cat' => 'gardiennage',   'montant' => 5000,  'date' => '2026-04-30', 'prest' => 3, 'statut' => 'paye'],
            ['desc' => 'Salaire gardien — mai',              'cat' => 'gardiennage',   'montant' => 5000,  'date' => '2026-05-15', 'prest' => 3, 'statut' => 'paye'],
            ['desc' => 'Nettoyage — janvier',                'cat' => 'nettoyage',     'montant' => 3000,  'date' => '2026-01-31', 'prest' => 1, 'statut' => 'paye'],
            ['desc' => 'Nettoyage — février',                'cat' => 'nettoyage',     'montant' => 3000,  'date' => '2026-02-28', 'prest' => 1, 'statut' => 'paye'],
            ['desc' => 'Nettoyage — mars',                   'cat' => 'nettoyage',     'montant' => 3000,  'date' => '2026-03-31', 'prest' => 1, 'statut' => 'paye'],
            ['desc' => 'Nettoyage — avril',                  'cat' => 'nettoyage',     'montant' => 3000,  'date' => '2026-04-30', 'prest' => 1, 'statut' => 'paye'],
            ['desc' => 'Nettoyage — mai',                    'cat' => 'nettoyage',     'montant' => 3000,  'date' => '2026-05-15', 'prest' => 1, 'statut' => 'paye'],
            ['desc' => 'Maintenance ascenseur — T1',         'cat' => 'entretien',     'montant' => 6000,  'date' => '2026-03-15', 'prest' => 0, 'statut' => 'paye'],
            ['desc' => 'Maintenance ascenseur — T2',         'cat' => 'entretien',     'montant' => 4000,  'date' => '2026-05-10', 'prest' => 0, 'statut' => 'en_attente'],
            ['desc' => 'Facture LYDEC eau — Q1',             'cat' => 'entretien',     'montant' => 3100,  'date' => '2026-04-05', 'prest' => null, 'statut' => 'paye'],
            ['desc' => 'Facture LYDEC eau — Q2',             'cat' => 'entretien',     'montant' => 3100,  'date' => '2026-05-12', 'prest' => null, 'statut' => 'en_attente'],
            ['desc' => 'Facture LYDEC électricité — Q1',     'cat' => 'entretien',     'montant' => 2150,  'date' => '2026-04-05', 'prest' => null, 'statut' => 'paye'],
            ['desc' => 'Facture LYDEC électricité — Q2',     'cat' => 'entretien',     'montant' => 2150,  'date' => '2026-05-12', 'prest' => null, 'statut' => 'en_attente'],
            ['desc' => 'Prime assurance multirisque 2026',   'cat' => 'assurance',     'montant' => 8000,  'date' => '2026-01-15', 'prest' => 6, 'statut' => 'paye'],
            ['desc' => 'Honoraires syndic — T1',             'cat' => 'administratif', 'montant' => 3000,  'date' => '2026-03-31', 'prest' => null, 'statut' => 'paye'],
            ['desc' => 'Honoraires syndic — T2',             'cat' => 'administratif', 'montant' => 2000,  'date' => '2026-05-15', 'prest' => null, 'statut' => 'paye'],
            ['desc' => 'Réparation interphone entrée',       'cat' => 'entretien',     'montant' => 1200,  'date' => '2026-03-22', 'prest' => 5, 'statut' => 'paye'],
            ['desc' => 'Remplacement ampoules LED couloirs', 'cat' => 'entretien',     'montant' => 800,   'date' => '2026-04-18', 'prest' => 5, 'statut' => 'paye'],
        ];

        $depenseIds = [];
        foreach ($depensesData as $d) {
            $dep = Depense::create([
                'tenant_id' => $this->t, 'exercice_id' => $ex2026->id, 'residence_id' => $r1->id,
                'prestataire_id' => $d['prest'] !== null ? $prestataires[$d['prest']]->id : null,
                'created_by' => $g1->id, 'description' => $d['desc'], 'categorie' => $d['cat'],
                'montant' => $d['montant'], 'date' => $d['date'], 'statut' => $d['statut'],
            ]);
            $depenseIds[] = $dep->id;
        }

        $this->command->info('  ✓ 21 dépenses');

        // ════════════════════════════════════════════════════════════
        // 11. TICKETS
        // ════════════════════════════════════════════════════════════
        $ticketsData = [
            ['user' => 0, 'cat' => 'ascenseur',   'desc' => "L'ascenseur est bloqué au 3ème étage depuis ce matin. Les résidents âgés ne peuvent pas monter. Très urgent svp.", 'priorite' => 'urgent', 'statut' => 'ouvert'],
            ['user' => 3, 'cat' => 'plomberie',   'desc' => "Fuite d'eau au plafond du 2ème étage, couloir B. L'eau coule depuis hier soir et abîme la peinture.", 'priorite' => 'normal', 'statut' => 'en_cours'],
            ['user' => 7, 'cat' => 'proprete',    'desc' => "Les poubelles du RDC débordent depuis 2 jours. Odeur insupportable. Contacter la société de nettoyage svp.", 'priorite' => 'faible', 'statut' => 'ouvert'],
            ['user' => 11, 'cat' => 'electricite', 'desc' => "L'éclairage du parking sous-sol ne fonctionne plus depuis 3 jours. C'est dangereux le soir.", 'priorite' => 'urgent', 'statut' => 'en_cours', 'ago' => 5],
            ['user' => 15, 'cat' => 'securite',   'desc' => "La porte d'entrée principale ne ferme plus correctement. Le système de badge est en panne.", 'priorite' => 'normal', 'statut' => 'ouvert', 'ago' => 2],
            ['user' => 5, 'cat' => 'plomberie',   'desc' => "Problème d'évacuation eaux usées au RDC. Remontée d'odeurs dans le hall. Intervention urgente nécessaire.", 'priorite' => 'urgent', 'statut' => 'resolu', 'ago' => 10, 'closed' => 3],
        ];

        foreach ($ticketsData as $td) {
            $data = [
                'tenant_id' => $this->t, 'residence_id' => $r1->id,
                'user_id' => $coprosAtlas[$td['user']]['user']->id,
                'lot_id' => $coprosAtlas[$td['user']]['lot']->id,
                'categorie' => $td['cat'], 'description' => $td['desc'],
                'priorite' => $td['priorite'], 'statut' => $td['statut'],
            ];
            if (isset($td['ago'])) $data['created_at'] = now()->subDays($td['ago']);
            if (isset($td['closed'])) $data['closed_at'] = now()->subDays($td['closed']);
            Ticket::create($data);
        }

        // Anfa ticket
        Ticket::create([
            'tenant_id' => $this->t, 'residence_id' => $r2->id,
            'user_id' => $coprosAnfa[2]['user']->id, 'lot_id' => $coprosAnfa[2]['lot']->id,
            'categorie' => 'proprete', 'description' => "La piscine n'a pas été nettoyée depuis 2 semaines. L'eau est verte.",
            'priorite' => 'normal', 'statut' => 'ouvert',
        ]);

        $this->command->info('  ✓ 7 tickets');

        // ════════════════════════════════════════════════════════════
        // 12. ANNONCES
        // ════════════════════════════════════════════════════════════
        $annoncesData = [
            ['res' => $r1->id, 'by' => $g1->id, 'titre' => "Coupure d'eau prévue — LYDEC", 'contenu' => "Chers copropriétaires,\n\nLa LYDEC effectuera des travaux de maintenance sur le réseau d'eau le mardi 20 mai de 8h à 14h.\n\nMerci de prévoir vos réserves d'eau à l'avance.\n\nCordialement,\nLa Gestion", 'priorite' => 'urgente', 'statut' => 'publiee', 'ago' => 2],
            ['res' => $r1->id, 'by' => $g1->id, 'titre' => 'Convocation AG Ordinaire — 14 juin 2026', 'contenu' => "L'Assemblée Générale Ordinaire de la copropriété Résidence Atlas se tiendra le samedi 14 juin 2026 à 15h00.\n\nOrdre du jour :\n1. Approbation des comptes 2025\n2. Budget prévisionnel 2026\n3. Travaux de ravalement façade\n4. Remplacement pompe eau\n5. Questions diverses", 'priorite' => 'urgente', 'statut' => 'publiee', 'ago' => 7],
            ['res' => $r1->id, 'by' => $g2->id, 'titre' => 'Nouveau règlement parking sous-sol', 'contenu' => "Suite aux incidents répétés au parking sous-sol, nous rappelons les règles suivantes :\n\n- Chaque lot dispose d'une seule place numérotée\n- Vitesse limitée à 10 km/h\n- Le parking ferme à 23h00", 'priorite' => 'normale', 'statut' => 'publiee', 'ago' => 14],
            ['res' => null, 'by' => $manager->id, 'titre' => 'Bienvenue sur la plateforme imaro', 'contenu' => "Bienvenue sur imaro ! Consultez vos charges, paiements, et soumettez vos réclamations.", 'priorite' => 'normale', 'statut' => 'publiee', 'ago' => 30],
            ['res' => $r1->id, 'by' => $g1->id, 'titre' => 'Travaux ravalement façade — devis en cours', 'contenu' => "Suite à l'AG du 14 juin, les devis pour le ravalement de la façade sont en cours de collecte.", 'priorite' => 'normale', 'statut' => 'brouillon', 'ago' => 0],
            ['res' => $r2->id, 'by' => $g2->id, 'titre' => 'Fermeture piscine pour maintenance', 'contenu' => "La piscine sera fermée du 25 au 30 mai pour nettoyage en profondeur et traitement chimique.", 'priorite' => 'normale', 'statut' => 'publiee', 'ago' => 1],
        ];

        foreach ($annoncesData as $a) {
            $data = [
                'tenant_id' => $this->t, 'residence_id' => $a['res'], 'created_by' => $a['by'],
                'titre' => $a['titre'], 'contenu' => $a['contenu'],
                'priorite' => $a['priorite'], 'statut' => $a['statut'],
            ];
            if ($a['statut'] === 'publiee') $data['publiee_at'] = now()->subDays($a['ago']);
            Annonce::create($data);
        }

        $this->command->info('  ✓ 6 annonces');

        // ════════════════════════════════════════════════════════════
        // 13. ASSEMBLÉES
        // ════════════════════════════════════════════════════════════
        Assemblee::create(['tenant_id' => $this->t, 'residence_id' => $r1->id, 'created_by' => $g1->id, 'titre' => 'AG Ordinaire 2026', 'type' => 'ordinaire', 'date' => '2026-06-14 15:00:00', 'lieu' => 'Salle de réunion RDC, Résidence Atlas', 'quorum_requis' => 50, 'ordre_du_jour' => "Approbation des comptes 2025\nBudget prévisionnel 2026\nTravaux de ravalement façade", 'statut' => 'planifiee']);
        Assemblee::create(['tenant_id' => $this->t, 'residence_id' => $r1->id, 'created_by' => $g1->id, 'titre' => 'AG Extraordinaire — Travaux toiture', 'type' => 'extraordinaire', 'date' => '2026-07-20 10:00:00', 'lieu' => 'Salle de réunion RDC, Résidence Atlas', 'quorum_requis' => 66, 'ordre_du_jour' => "Présentation devis travaux toiture terrasse\nVote sur le prestataire retenu", 'statut' => 'planifiee']);
        $ag2025 = Assemblee::create(['tenant_id' => $this->t, 'residence_id' => $r1->id, 'created_by' => $g1->id, 'titre' => 'AG Ordinaire 2025', 'type' => 'ordinaire', 'date' => '2025-06-20 15:00:00', 'lieu' => 'Salle de réunion RDC, Résidence Atlas', 'quorum_requis' => 50, 'ordre_du_jour' => "Approbation des comptes 2024\nBudget prévisionnel 2025", 'statut' => 'tenue', 'quorum_atteint' => true]);
        Assemblee::create(['tenant_id' => $this->t, 'residence_id' => $r2->id, 'created_by' => $g2->id, 'titre' => 'AG Ordinaire Anfa Gardens 2026', 'type' => 'ordinaire', 'date' => '2026-06-28 16:00:00', 'lieu' => 'Salon commun, Résidence Anfa Gardens', 'quorum_requis' => 50, 'ordre_du_jour' => "Approbation des comptes 2025\nBudget prévisionnel 2026\nRénovation piscine", 'statut' => 'planifiee']);

        $this->command->info('  ✓ 4 assemblées');

        // ════════════════════════════════════════════════════════════
        // 14. DOCUMENTS
        // ════════════════════════════════════════════════════════════
        $docsData = [
            ['nom' => 'PV AG Ordinaire 2025', 'type' => 'pv_ag', 'res' => $r1->id, 'by' => $g1->id, 'ko' => 245, 'date' => '2025-06-25'],
            ['nom' => 'Règlement de copropriété — Atlas', 'type' => 'reglement', 'res' => $r1->id, 'by' => $g1->id, 'ko' => 1240, 'date' => '2020-03-15'],
            ['nom' => 'Contrat gardiennage 2026', 'type' => 'contrat', 'res' => $r1->id, 'by' => $g1->id, 'ko' => 320, 'date' => '2026-01-05'],
            ['nom' => 'Facture LYDEC eau Q1 2026', 'type' => 'facture', 'res' => $r1->id, 'by' => $g1->id, 'ko' => 85, 'date' => '2026-04-05'],
            ['nom' => 'Facture LYDEC électricité Q1 2026', 'type' => 'facture', 'res' => $r1->id, 'by' => $g1->id, 'ko' => 78, 'date' => '2026-04-05'],
            ['nom' => 'Assurance multirisque Wiqaya 2026', 'type' => 'autre', 'res' => $r1->id, 'by' => $manager->id, 'ko' => 410, 'date' => '2026-01-10'],
            ['nom' => 'Loi 18-00 copropriété', 'type' => 'autre', 'res' => null, 'by' => $manager->id, 'ko' => 890, 'date' => '2024-01-01'],
            ['nom' => 'Règlement copropriété Anfa Gardens', 'type' => 'reglement', 'res' => $r2->id, 'by' => $g2->id, 'ko' => 980, 'date' => '2022-06-10'],
        ];

        foreach ($docsData as $doc) {
            Document::create([
                'tenant_id' => $this->t, 'residence_id' => $doc['res'], 'uploaded_by' => $doc['by'],
                'nom' => $doc['nom'], 'type' => $doc['type'],
                'file_path' => 'documents/'.strtolower(str_replace([' ', '—', "'"], ['-', '', ''], $doc['nom'])).'.pdf',
                'mime_type' => 'application/pdf', 'taille_ko' => $doc['ko'], 'date' => $doc['date'],
            ]);
        }

        $this->command->info('  ✓ 8 documents');

        // ════════════════════════════════════════════════════════════
        // 15. NOTIFICATIONS
        // ════════════════════════════════════════════════════════════
        $notifs = [
            ['user' => $g1->id, 'type' => 'paiement',  'title' => 'Paiement reçu',           'msg' => 'Hassan Benali a réglé 975 MAD — Lot A101 (Q2 2026)', 'read' => false, 'ago' => 1],
            ['user' => $g1->id, 'type' => 'paiement',  'title' => 'Paiement reçu',           'msg' => 'Fatima Chraibi a réglé 825 MAD par virement — Lot A102', 'read' => false, 'ago' => 2],
            ['user' => $g1->id, 'type' => 'ticket',    'title' => 'Nouvelle réclamation',     'msg' => 'Hassan Benali : "L\'ascenseur est bloqué au 3ème étage"', 'read' => false, 'ago' => 3],
            ['user' => $g1->id, 'type' => 'retard',    'title' => 'Impayé détecté',           'msg' => 'Tariq Lamrani — Lot A117 : 675 MAD en retard de 15 jours', 'read' => false, 'ago' => 5],
            ['user' => $g1->id, 'type' => 'retard',    'title' => 'Impayé détecté',           'msg' => 'Hafida Ghazi — Lot A118 : 675 MAD en retard de 15 jours', 'read' => true, 'ago' => 5],
            ['user' => $g1->id, 'type' => 'ticket',    'title' => 'Réclamation mise à jour',  'msg' => 'Ticket #2 (plomberie) passé en statut "en cours"', 'read' => true, 'ago' => 7],
            ['user' => $g1->id, 'type' => 'assemblee', 'title' => 'AG planifiée',             'msg' => 'AG Ordinaire 2026 prévue le 14 juin — Résidence Atlas', 'read' => true, 'ago' => 14],
            ['user' => $g1->id, 'type' => 'paiement',  'title' => 'Paiement partiel',         'msg' => 'Meriem Ouazzani a réglé 300 MAD sur 750 MAD — Lot B1', 'read' => false, 'ago' => 4],
            ['user' => $g2->id, 'type' => 'ticket',    'title' => 'Nouvelle réclamation',     'msg' => 'Hamza El Idrissi : "Piscine non nettoyée depuis 2 semaines"', 'read' => false, 'ago' => 1],
            ['user' => $g2->id, 'type' => 'paiement',  'title' => 'Paiement reçu',           'msg' => 'Amine Benjelloun a réglé 3 000 MAD — Lot C201 (S1 Anfa)', 'read' => false, 'ago' => 3],
            ['user' => $g2->id, 'type' => 'retard',    'title' => 'Impayé détecté',           'msg' => 'Imane Kabbaj — Lot C208 : 2 250 MAD en retard de 20 jours', 'read' => true, 'ago' => 8],
        ];

        foreach ($notifs as $n) {
            Notification::create([
                'tenant_id' => $this->t, 'user_id' => $n['user'], 'type' => $n['type'],
                'title' => $n['title'], 'message' => $n['msg'], 'read' => $n['read'],
                'created_at' => now()->subDays($n['ago']), 'updated_at' => now()->subDays($n['ago']),
            ]);
        }

        $this->command->info('  ✓ 11 notifications');

        // ════════════════════════════════════════════════════════════
        // 16. SPRINT 4 — CONFORMITÉ (Audit logs, Occupants, Penalties)
        // ════════════════════════════════════════════════════════════
        $this->seedAuditLogs($manager, $g1, $g2);
        $this->seedOccupants($r1, $coprosAtlas);
        $this->seedPenaltyConfig($r1);
        $this->seedPenaltyConfig($r2);

        // Compliance calendar
        foreach ([$r1, $r2] as $res) {
            try {
                $service = new ComplianceCalendarService();
                $service->seedForExercice($res->id, 2026);
                ComplianceCalendarTask::where('residence_id', $res->id)
                    ->where('exercice', 2026)->where('phase', 'operations_mensuelles')
                    ->where('due_date', '<', now()->toDateString())
                    ->update(['status' => 'done', 'completed_at' => now()->subDays(3), 'completed_by' => $g1->id]);
            } catch (\Throwable $e) {
                $this->command->warn("  ! Compliance calendar skipped: {$e->getMessage()}");
            }
        }

        $this->command->info('  ✓ Sprint 4: audit logs, occupants, penalty configs, compliance tasks');

        // ════════════════════════════════════════════════════════════
        // 17. SPRINT 5 — BILAN D'OUVERTURE
        // ════════════════════════════════════════════════════════════
        $bilanLignes = [
            ['numero' => '105', 'libelle' => 'Fonds de roulement',                     'debit' => 0,        'credit' => 45000],
            ['numero' => '106', 'libelle' => 'Fonds travaux (Loi 18-00 Art. 26)',       'debit' => 0,        'credit' => 32000],
            ['numero' => '108', 'libelle' => 'Report à nouveau exercice 2025',          'debit' => 0,        'credit' => 8500],
            ['numero' => '164', 'libelle' => 'Emprunt bancaire — Crédit Immobilier',   'debit' => 0,        'credit' => 180000],
            ['numero' => '320', 'libelle' => 'Charges de copropriété à recevoir',       'debit' => 15200,    'credit' => 0],
            ['numero' => '401', 'libelle' => 'Fournisseurs — factures non réglées',    'debit' => 0,        'credit' => 12300],
            ['numero' => '411', 'libelle' => 'Copropriétaires — cotisations à recevoir','debit' => 28750,    'credit' => 0],
            ['numero' => '421', 'libelle' => 'Personnel — rémunérations dues',         'debit' => 0,        'credit' => 5200],
            ['numero' => '512', 'libelle' => 'Banque Attijari — CIN 2065410033',       'debit' => 142350,   'credit' => 0],
            ['numero' => '531', 'libelle' => 'Caisse',                                  'debit' => 3200,     'credit' => 0],
        ];

        foreach ($bilanLignes as $bl) {
            BilanOuvertureLigne::create([
                'tenant_id' => $this->t, 'residence_id' => $r1->id, 'exercice_id' => $ex2026->id,
                'created_by' => $g1->id, 'numero_compte' => $bl['numero'],
                'libelle' => $bl['libelle'], 'solde_debit' => $bl['debit'], 'solde_credit' => $bl['credit'],
            ]);
        }

        // Anfa bilan
        $bilanAnfa = [
            ['numero' => '105', 'libelle' => 'Fonds de roulement',                 'debit' => 0,     'credit' => 25000],
            ['numero' => '411', 'libelle' => 'Copropriétaires — cotisations dues', 'debit' => 18500, 'credit' => 0],
            ['numero' => '512', 'libelle' => 'Banque CIH — CIN 4021330055',       'debit' => 67800, 'credit' => 0],
            ['numero' => '401', 'libelle' => 'Fournisseurs',                       'debit' => 0,     'credit' => 8700],
            ['numero' => '531', 'libelle' => 'Caisse',                              'debit' => 1900,  'credit' => 0],
        ];

        foreach ($bilanAnfa as $bl) {
            BilanOuvertureLigne::create([
                'tenant_id' => $this->t, 'residence_id' => $r2->id, 'exercice_id' => $exAnfa->id,
                'created_by' => $g2->id, 'numero_compte' => $bl['numero'],
                'libelle' => $bl['libelle'], 'solde_debit' => $bl['debit'], 'solde_credit' => $bl['credit'],
            ]);
        }

        $this->command->info('  ✓ Sprint 5: 15 lignes bilan d\'ouverture (10 Atlas + 5 Anfa)');

        // ════════════════════════════════════════════════════════════
        // 18. SPRINT 7 — ÉQUIPEMENTS
        // ════════════════════════════════════════════════════════════
        $equipements = [
            ['designation' => 'Ascenseur Schindler 3300 (Immeuble A)', 'categorie' => 'ascenseur', 'date_acq' => '2020-06-15', 'valeur' => 350000, 'duree' => 240, 'notes' => 'Capacité 8 personnes, 630kg. Contrat maintenance annuel.'],
            ['designation' => 'Système vidéosurveillance Hikvision', 'categorie' => 'videosurveillance', 'date_acq' => '2023-03-10', 'valeur' => 45000, 'duree' => 120, 'notes' => '16 caméras IP + NVR 32 canaux. Stockage 4 To.'],
            ['designation' => 'Portail automatique BFT', 'categorie' => 'securite', 'date_acq' => '2022-01-20', 'valeur' => 28000, 'duree' => 120, 'notes' => 'Portail coulissant motorisé avec télécommandes.'],
            ['designation' => 'Pompe de relevage eaux usées', 'categorie' => 'plomberie', 'date_acq' => '2024-09-05', 'valeur' => 18500, 'duree' => 96, 'notes' => 'Pompe Grundfos, sous-sol parking. Garantie 3 ans.'],
            ['designation' => 'Groupe électrogène SDMO', 'categorie' => 'electricite', 'date_acq' => '2021-11-15', 'valeur' => 85000, 'duree' => 180, 'notes' => 'Puissance 60 kVA. Démarrage automatique.'],
            ['designation' => 'Tondeuse robot Husqvarna', 'categorie' => 'jardinage', 'date_acq' => '2025-04-01', 'valeur' => 12000, 'duree' => 60, 'notes' => 'Automower 430X pour espaces verts communs.'],
            ['designation' => 'Climatisation hall (split gainable)', 'categorie' => 'climatisation', 'date_acq' => '2023-07-20', 'valeur' => 32000, 'duree' => 144, 'notes' => 'Daikin 4 splits gainables pour hall principal.'],
            ['designation' => 'Détecteur incendie ESSER', 'categorie' => 'securite', 'date_acq' => '2022-05-10', 'valeur' => 22000, 'duree' => 120, 'notes' => 'Centrale IQ8Control M + 45 détecteurs optiques.'],
        ];

        foreach ($equipements as $eq) {
            $dateAcq = Carbon::parse($eq['date_acq']);
            $moisEcoules = $dateAcq->diffInMonths(now());
            $amortMensuel = $eq['valeur'] / $eq['duree'];
            $valeurNette = max(0, round($eq['valeur'] - ($amortMensuel * $moisEcoules), 2));

            Equipement::create([
                'tenant_id' => $this->t, 'residence_id' => $r1->id,
                'designation' => $eq['designation'], 'categorie' => $eq['categorie'],
                'date_acquisition' => $eq['date_acq'], 'valeur_acquisition' => $eq['valeur'],
                'duree_amortissement_mois' => $eq['duree'], 'valeur_nette' => $valeurNette,
                'notes' => $eq['notes'], 'actif' => true,
            ]);
        }

        // Anfa
        Equipement::create([
            'tenant_id' => $this->t, 'residence_id' => $r2->id,
            'designation' => 'Système filtration piscine Pentair', 'categorie' => 'autre',
            'date_acquisition' => '2023-05-15', 'valeur_acquisition' => 65000,
            'duree_amortissement_mois' => 120, 'valeur_nette' => 45500,
            'notes' => 'Filtre à sable + pompe doseuse chlore. Entretien hebdomadaire.', 'actif' => true,
        ]);
        Equipement::create([
            'tenant_id' => $this->t, 'residence_id' => $r2->id,
            'designation' => 'Ascenseur OTIS Gen2 (Anfa)', 'categorie' => 'ascenseur',
            'date_acquisition' => '2022-03-01', 'valeur_acquisition' => 280000,
            'duree_amortissement_mois' => 240, 'valeur_nette' => 220000,
            'notes' => 'Capacité 6 personnes. Sans local machines.', 'actif' => true,
        ]);

        $this->command->info('  ✓ Sprint 7: 10 équipements (8 Atlas + 2 Anfa)');

        // ════════════════════════════════════════════════════════════
        // 19. SPRINT 7 — EMPRUNTS
        // ════════════════════════════════════════════════════════════
        Emprunt::create([
            'tenant_id' => $this->t, 'residence_id' => $r1->id,
            'libelle' => 'Crédit rénovation toiture terrasse', 'organisme' => 'Crédit Immobilier et Hôtelier (CIH)',
            'date_debut' => '2024-01-15', 'date_fin' => '2028-01-15',
            'montant_initial' => 300000, 'taux_interet' => 5.50, 'duree_mois' => 48,
            'mensualite' => 6950, 'paye_cumule' => 194600, 'paye_exercice' => 41700,
            'reste' => 105400, 'statut' => 'actif',
            'notes' => 'Travaux votés AG juin 2023. Première échéance 15/01/2024.',
        ]);

        Emprunt::create([
            'tenant_id' => $this->t, 'residence_id' => $r1->id,
            'libelle' => 'Financement remplacement ascenseur', 'organisme' => 'Attijariwafa Bank',
            'date_debut' => '2025-06-01', 'date_fin' => '2030-06-01',
            'montant_initial' => 450000, 'taux_interet' => 4.75, 'duree_mois' => 60,
            'mensualite' => 8450, 'paye_cumule' => 101400, 'paye_exercice' => 50700,
            'reste' => 348600, 'statut' => 'actif',
            'notes' => 'Ascenseur Schindler à remplacer par OTIS Gen3. AG extraordinaire mars 2025.',
        ]);

        Emprunt::create([
            'tenant_id' => $this->t, 'residence_id' => $r1->id,
            'libelle' => 'Prêt ravalement façade 2022', 'organisme' => 'Banque Populaire',
            'date_debut' => '2022-09-01', 'date_fin' => '2025-09-01',
            'montant_initial' => 180000, 'taux_interet' => 6.00, 'duree_mois' => 36,
            'mensualite' => 5480, 'paye_cumule' => 180000, 'paye_exercice' => 0,
            'reste' => 0, 'statut' => 'rembourse',
            'notes' => 'Entièrement remboursé en septembre 2025.',
        ]);

        $this->command->info('  ✓ Sprint 7: 3 emprunts (2 actifs + 1 remboursé)');

        // ════════════════════════════════════════════════════════════
        // 20. SPRINT 7 — TRAVAUX EXCEPTIONNELS
        // ════════════════════════════════════════════════════════════
        TravauxExceptionnel::create([
            'tenant_id' => $this->t, 'residence_id' => $r1->id,
            'libelle' => 'Ravalement façade Immeuble A', 'description' => 'Ravalement complet : nettoyage haute pression, enduit, peinture anti-humidité. Devis retenu : Batiplus Maroc.',
            'date_vote_ag' => '2026-06-14', 'ag_id' => null, 'prestataire' => 'Batiplus Maroc SARL',
            'montant_vote' => 250000, 'montant_engage' => 100000, 'montant_regle' => 50000,
            'date_debut' => '2026-07-01', 'date_fin_prevue' => '2026-10-31', 'date_fin_reelle' => null,
            'statut' => 'en_cours',
        ]);

        TravauxExceptionnel::create([
            'tenant_id' => $this->t, 'residence_id' => $r1->id,
            'libelle' => 'Étanchéité toiture terrasse', 'description' => 'Réfection complète étanchéité terrasse + pose nouvelle membrane bitumineuse. Urgent après infiltrations.',
            'date_vote_ag' => '2025-06-20', 'ag_id' => $ag2025->id, 'prestataire' => 'Toiture Pro Casablanca',
            'montant_vote' => 180000, 'montant_engage' => 180000, 'montant_regle' => 180000,
            'date_debut' => '2025-08-01', 'date_fin_prevue' => '2025-10-15', 'date_fin_reelle' => '2025-10-10',
            'statut' => 'termine',
        ]);

        TravauxExceptionnel::create([
            'tenant_id' => $this->t, 'residence_id' => $r1->id,
            'libelle' => 'Installation borne de recharge véhicules électriques', 'description' => 'Installation de 4 bornes de recharge au parking sous-sol. Soumis au vote AG juillet 2026.',
            'date_vote_ag' => '2026-07-20', 'ag_id' => null, 'prestataire' => null,
            'montant_vote' => 120000, 'montant_engage' => 0, 'montant_regle' => 0,
            'date_debut' => null, 'date_fin_prevue' => null, 'date_fin_reelle' => null,
            'statut' => 'vote',
        ]);

        TravauxExceptionnel::create([
            'tenant_id' => $this->t, 'residence_id' => $r2->id,
            'libelle' => 'Rénovation piscine — Anfa Gardens', 'description' => 'Réfection liner, remplacement système de filtration, mise aux normes sanitaires.',
            'date_vote_ag' => '2026-06-28', 'ag_id' => null, 'prestataire' => 'AquaMaroc Piscines',
            'montant_vote' => 95000, 'montant_engage' => 45000, 'montant_regle' => 20000,
            'date_debut' => '2026-08-01', 'date_fin_prevue' => '2026-09-15', 'date_fin_reelle' => null,
            'statut' => 'en_cours',
        ]);

        $this->command->info('  ✓ Sprint 7: 4 travaux exceptionnels (1 terminé, 2 en cours, 1 voté)');

        // ════════════════════════════════════════════════════════════
        // 21. SPRINT 7 — AUTRES RECETTES
        // ════════════════════════════════════════════════════════════
        $recettes = [
            ['res' => $r1->id, 'date' => '2026-01-15', 'libelle' => 'Location parking visiteurs — Janvier', 'categorie' => 'location_parking', 'montant' => 2400, 'payeur' => 'Société Diamant Auto', 'ref' => 'REC-2026-001'],
            ['res' => $r1->id, 'date' => '2026-02-15', 'libelle' => 'Location parking visiteurs — Février', 'categorie' => 'location_parking', 'montant' => 2400, 'payeur' => 'Société Diamant Auto', 'ref' => 'REC-2026-002'],
            ['res' => $r1->id, 'date' => '2026-03-15', 'libelle' => 'Location parking visiteurs — Mars', 'categorie' => 'location_parking', 'montant' => 2400, 'payeur' => 'Société Diamant Auto', 'ref' => 'REC-2026-003'],
            ['res' => $r1->id, 'date' => '2026-04-15', 'libelle' => 'Location parking visiteurs — Avril', 'categorie' => 'location_parking', 'montant' => 2400, 'payeur' => 'Société Diamant Auto', 'ref' => 'REC-2026-004'],
            ['res' => $r1->id, 'date' => '2026-05-15', 'libelle' => 'Location parking visiteurs — Mai', 'categorie' => 'location_parking', 'montant' => 2400, 'payeur' => 'Société Diamant Auto', 'ref' => 'REC-2026-005'],
            ['res' => $r1->id, 'date' => '2026-02-01', 'libelle' => 'Location terrasse antenne Inwi', 'categorie' => 'location_antenne', 'montant' => 18000, 'payeur' => 'Inwi Telecom', 'ref' => 'REC-2026-ANT-001'],
            ['res' => $r1->id, 'date' => '2026-03-20', 'libelle' => 'Indemnité assurance — dégât des eaux parking', 'categorie' => 'indemnite_assurance', 'montant' => 8500, 'payeur' => 'Wiqaya Assurance', 'ref' => 'IND-2026-001'],
            ['res' => $r1->id, 'date' => '2026-04-30', 'libelle' => 'Pénalités de retard — copropriétaires Q1', 'categorie' => 'penalite_retard', 'montant' => 3200, 'payeur' => null, 'ref' => 'PEN-2026-Q1'],
            ['res' => $r1->id, 'date' => '2026-01-31', 'libelle' => 'Intérêts compte épargne copropriété', 'categorie' => 'produits_financiers', 'montant' => 450, 'payeur' => 'Attijari Bank', 'ref' => 'FIN-2026-001'],
            ['res' => $r1->id, 'date' => '2026-05-10', 'libelle' => 'Location salle commune pour événement', 'categorie' => 'location_salle', 'montant' => 1500, 'payeur' => 'Famille Bennani', 'ref' => 'LOC-2026-001'],
            ['res' => $r2->id, 'date' => '2026-01-05', 'libelle' => 'Location local commercial RDC', 'categorie' => 'location_salle', 'montant' => 5000, 'payeur' => 'Café Anfa Délices', 'ref' => 'REC-ANFA-001'],
            ['res' => $r2->id, 'date' => '2026-03-01', 'libelle' => 'Location antenne Orange', 'categorie' => 'location_antenne', 'montant' => 15000, 'payeur' => 'Orange Maroc', 'ref' => 'REC-ANFA-ANT'],
            ['res' => $r2->id, 'date' => '2026-04-15', 'libelle' => 'Pénalités retard copropriétaires', 'categorie' => 'penalite_retard', 'montant' => 1800, 'payeur' => null, 'ref' => 'PEN-ANFA-Q1'],
        ];

        foreach ($recettes as $r) {
            AutreRecette::create([
                'tenant_id' => $this->t, 'residence_id' => $r['res'], 'exercice' => 2026,
                'date' => $r['date'], 'libelle' => $r['libelle'], 'categorie' => $r['categorie'],
                'montant' => $r['montant'], 'payeur' => $r['payeur'], 'reference' => $r['ref'],
            ]);
        }

        $this->command->info('  ✓ Sprint 7: 13 autres recettes (10 Atlas + 3 Anfa)');

        // ════════════════════════════════════════════════════════════
        // 22. SPRINT 7 — REMBOURSEMENTS
        // ════════════════════════════════════════════════════════════
        Remboursement::create([
            'tenant_id' => $this->t, 'residence_id' => $r1->id,
            'coproprietaire_id' => $coprosAtlas[0]['copro']->id,
            'coproprietaire_nom' => 'Hassan Benali', 'lot_numero' => 'A101',
            'motif' => 'trop_percu', 'description' => 'Double paiement Q1 2026 — virement et chèque effectués par erreur.',
            'montant' => 975, 'date_demande' => '2026-04-05', 'date_paiement' => '2026-04-15',
            'mode_paiement' => 'virement', 'reference' => 'REMB-2026-001', 'statut' => 'paye',
        ]);

        Remboursement::create([
            'tenant_id' => $this->t, 'residence_id' => $r1->id,
            'coproprietaire_id' => $coprosAtlas[5]['copro']->id,
            'coproprietaire_nom' => 'Amina Kettani', 'lot_numero' => 'A106',
            'motif' => 'erreur_appel', 'description' => 'Erreur de calcul tantième dans l\'appel Q2 — surplus de 200 DH.',
            'montant' => 200, 'date_demande' => '2026-05-10', 'date_paiement' => null,
            'mode_paiement' => null, 'reference' => null, 'statut' => 'approuve',
        ]);

        Remboursement::create([
            'tenant_id' => $this->t, 'residence_id' => $r1->id,
            'coproprietaire_id' => $coprosAtlas[12]['copro']->id,
            'coproprietaire_nom' => 'Samir Cherkaoui', 'lot_numero' => 'A113',
            'motif' => 'indemnite', 'description' => 'Indemnisation dégât des eaux causé par fuite parties communes dans lot A113.',
            'montant' => 4500, 'date_demande' => '2026-03-25', 'date_paiement' => null,
            'mode_paiement' => null, 'reference' => null, 'statut' => 'demande',
        ]);

        Remboursement::create([
            'tenant_id' => $this->t, 'residence_id' => $r2->id,
            'coproprietaire_id' => $coprosAnfa[3]['copro']->id,
            'coproprietaire_nom' => 'Layla Senhaji', 'lot_numero' => 'C204',
            'motif' => 'trop_percu', 'description' => 'Cotisation payée 2 fois via application mobile.',
            'montant' => 2500, 'date_demande' => '2026-05-01', 'date_paiement' => '2026-05-08',
            'mode_paiement' => 'cheque', 'reference' => 'CHQ-ANFA-2026-001', 'statut' => 'paye',
        ]);

        Remboursement::create([
            'tenant_id' => $this->t, 'residence_id' => $r1->id,
            'coproprietaire_id' => $coprosAtlas[8]['copro']->id,
            'coproprietaire_nom' => 'Mehdi Bensouda', 'lot_numero' => 'A109',
            'motif' => 'autre', 'description' => 'Remboursement part travaux annulés (installation interphone individuel).',
            'montant' => 350, 'date_demande' => '2026-02-20', 'date_paiement' => null,
            'mode_paiement' => null, 'reference' => null, 'statut' => 'rejete',
        ]);

        $this->command->info('  ✓ Sprint 7: 5 remboursements (2 payés, 1 approuvé, 1 demande, 1 rejeté)');

        // ════════════════════════════════════════════════════════════
        // 23. SPRINT 6 — POINTAGE BANCAIRE
        // ════════════════════════════════════════════════════════════
        $paiementIds = Paiement::where('exercice_id', $ex2026->id)->limit(10)->pluck('id')->toArray();

        $bankLines = [
            ['date' => '2026-01-15', 'libelle' => 'VIR BENALI HASSAN CHARGES Q1', 'debit' => 0, 'credit' => 975],
            ['date' => '2026-01-18', 'libelle' => 'CHQ 0045892 CHRAIBI FATIMA', 'debit' => 0, 'credit' => 825],
            ['date' => '2026-01-22', 'libelle' => 'VIR TAZI YOUSSEF COTISATION Q1', 'debit' => 0, 'credit' => 750],
            ['date' => '2026-01-31', 'libelle' => 'PRLV GARDE SECURITE MAROC JANV', 'debit' => 5000, 'credit' => 0],
            ['date' => '2026-01-31', 'libelle' => 'PRLV PROCLEAN NETTOYAGE JANV', 'debit' => 3000, 'credit' => 0],
            ['date' => '2026-02-05', 'libelle' => 'VIR BERRADA NADIA CHARGES Q1', 'debit' => 0, 'credit' => 750],
            ['date' => '2026-02-10', 'libelle' => 'VIR FASSI OMAR CHARGES Q1', 'debit' => 0, 'credit' => 750],
            ['date' => '2026-02-15', 'libelle' => 'RETRAIT DAB CAISSE COPRO', 'debit' => 2000, 'credit' => 0],
            ['date' => '2026-02-28', 'libelle' => 'PRLV GARDE SECURITE MAROC FEV', 'debit' => 5000, 'credit' => 0],
            ['date' => '2026-02-28', 'libelle' => 'PRLV PROCLEAN NETTOYAGE FEV', 'debit' => 3000, 'credit' => 0],
            ['date' => '2026-03-01', 'libelle' => 'INTERETS CREDITEURS T4 2025', 'debit' => 0, 'credit' => 450],
            ['date' => '2026-03-05', 'libelle' => 'VIR KETTANI AMINA CHARGES Q1', 'debit' => 0, 'credit' => 750],
            ['date' => '2026-03-10', 'libelle' => 'CHQ 0046120 SQUALLI RACHID', 'debit' => 0, 'credit' => 750],
            ['date' => '2026-03-15', 'libelle' => 'PRLV ATLAS ASCENSEURS MAINT T1', 'debit' => 6000, 'credit' => 0],
            ['date' => '2026-03-20', 'libelle' => 'FRAIS BANCAIRES MARS', 'debit' => 120, 'credit' => 0],
            ['date' => '2026-03-31', 'libelle' => 'PRLV GARDE SECURITE MAROC MARS', 'debit' => 5000, 'credit' => 0],
        ];

        $totalDebit = collect($bankLines)->sum('debit');
        $totalCredit = collect($bankLines)->sum('credit');

        $session = PointageSession::create([
            'tenant_id' => $this->t, 'residence_id' => $r1->id, 'created_by' => $g1->id,
            'banque' => 'Attijari Bank — Compte 2065410033',
            'file_path' => null,
            'totals' => ['total_debit' => $totalDebit, 'total_credit' => $totalCredit, 'solde' => $totalCredit - $totalDebit],
            'lines' => $bankLines,
        ]);

        // Create some confirmed matches
        $matchData = [
            ['line_idx' => 0, 'type' => 'paiement', 'id_idx' => 0],   // VIR BENALI → paiement 1
            ['line_idx' => 1, 'type' => 'paiement', 'id_idx' => 1],   // CHQ CHRAIBI → paiement 2
            ['line_idx' => 2, 'type' => 'paiement', 'id_idx' => 2],   // VIR TAZI → paiement 3
            ['line_idx' => 3, 'type' => 'depense',  'id_idx' => 0],   // PRLV GARDE → dépense gardien janv
            ['line_idx' => 4, 'type' => 'depense',  'id_idx' => 5],   // PRLV PROCLEAN → dépense nettoyage janv
        ];

        foreach ($matchData as $m) {
            $line = $bankLines[$m['line_idx']];
            $hash = md5($line['date'].$line['libelle'].($line['debit'] + $line['credit']));
            PointageLineMatch::create([
                'session_id' => $session->id, 'bank_line_hash' => $hash,
                'target_type' => $m['type'],
                'target_id' => $m['type'] === 'paiement' ? ($paiementIds[$m['id_idx']] ?? 1) : ($depenseIds[$m['id_idx']] ?? 1),
                'confirmed_at' => now()->subDays(5), 'confirmed_by' => $g1->id,
            ]);
        }

        // Anfa session — unmatched
        $bankLinesAnfa = [
            ['date' => '2026-01-10', 'libelle' => 'VIR BENJELLOUN AMINE COTISATION', 'debit' => 0, 'credit' => 3000],
            ['date' => '2026-01-20', 'libelle' => 'VIR TOUZANI SALMA S1 2026', 'debit' => 0, 'credit' => 2750],
            ['date' => '2026-01-31', 'libelle' => 'PRLV GARDE SECURITE MAROC JANV ANFA', 'debit' => 4000, 'credit' => 0],
            ['date' => '2026-02-01', 'libelle' => 'VIR ORANGE MAROC LOCATION ANTENNE', 'debit' => 0, 'credit' => 15000],
            ['date' => '2026-02-15', 'libelle' => 'VIR EL IDRISSI HAMZA S1 ANFA', 'debit' => 0, 'credit' => 2500],
        ];

        PointageSession::create([
            'tenant_id' => $this->t, 'residence_id' => $r2->id, 'created_by' => $g2->id,
            'banque' => 'CIH Bank — Compte 4021330055', 'file_path' => null,
            'totals' => ['total_debit' => 4000, 'total_credit' => 23250, 'solde' => 19250],
            'lines' => $bankLinesAnfa,
        ]);

        $this->command->info('  ✓ Sprint 6: 2 sessions pointage bancaire (Atlas: 16 lignes, 5 matchées + Anfa: 5 lignes)');

        // ════════════════════════════════════════════════════════════
        // RÉSUMÉ FINAL
        // ════════════════════════════════════════════════════════════
        $this->command->info('');
        $this->command->info('  ╔══════════════════════════════════════════════════════════╗');
        $this->command->info('  ║   SEED COMPLETE                                         ║');
        $this->command->info('  ╠══════════════════════════════════════════════════════════╣');
        $this->command->info('  ║   Connexion:                                            ║');
        $this->command->info('  ║     Manager:       fikri@blancasyndic.ma / imaro2026    ║');
        $this->command->info('  ║     Gestionnaire1: alaoui@blancasyndic.ma / imaro2026   ║');
        $this->command->info('  ║     Gestionnaire2: mansouri@blancasyndic.ma / imaro2026 ║');
        $this->command->info('  ║     Résidents:     30 (mot de passe: resident2026)      ║');
        $this->command->info('  ╠══════════════════════════════════════════════════════════╣');
        $this->command->info('  ║   Data seeded:                                          ║');
        $this->command->info('  ║   - 2 résidences, 30 lots, 30 copropriétaires           ║');
        $this->command->info('  ║   - 3 exercices (2025 cloturé + 2026 Atlas + Anfa)      ║');
        $this->command->info('  ║   - 7 prestataires, 7 contrats                          ║');
        $this->command->info('  ║   - 2 budgets (15 postes), 3 appels fonds               ║');
        $this->command->info('  ║   - ~42 paiements, 21 dépenses                          ║');
        $this->command->info('  ║   - 7 tickets, 6 annonces, 4 assemblées                 ║');
        $this->command->info('  ║   - 15 lignes bilan ouverture                           ║');
        $this->command->info('  ║   - 10 équipements, 3 emprunts                          ║');
        $this->command->info('  ║   - 4 travaux exceptionnels                             ║');
        $this->command->info('  ║   - 13 autres recettes                                  ║');
        $this->command->info('  ║   - 5 remboursements                                    ║');
        $this->command->info('  ║   - 2 sessions pointage bancaire (21 lignes, 5 matchs)  ║');
        $this->command->info('  ║   - Audit logs, occupants, penalty configs               ║');
        $this->command->info('  ╚══════════════════════════════════════════════════════════╝');
        $this->command->info('');
    }

    // ── Helpers ─────────────────────────────────────────────────

    private function createUser(string $name, string $phone, string $email, string $role, string $hashedPwd, ?array $notifPrefs = null): User
    {
        $user = User::create([
            'tenant_id' => $this->t, 'name' => $name, 'phone' => $phone,
            'email' => $email, 'password' => $hashedPwd, 'role' => $role, 'status' => 'active',
            'notification_prefs' => $notifPrefs,
        ]);
        $user->assignRole($role);
        return $user;
    }

    private function createExercice(int $residenceId, int $annee, string $statut): Exercice
    {
        return Exercice::withoutGlobalScope('tenant')->create([
            'tenant_id' => $this->t, 'residence_id' => $residenceId,
            'annee' => $annee, 'date_debut' => "$annee-01-01", 'date_fin' => "$annee-12-31",
            'statut' => $statut,
        ]);
    }

    private function createAppelFonds(int $resId, int $exId, int $byId, string $libelle, string $desc, float $montant, string $echeance, string $statut, string $sentAt): AppelFonds
    {
        return AppelFonds::withoutGlobalScope('tenant')->create([
            'tenant_id' => $this->t, 'residence_id' => $resId, 'exercice_id' => $exId,
            'created_by' => $byId, 'libelle' => $libelle, 'description' => $desc,
            'montant_total' => $montant, 'date_echeance' => Carbon::parse($echeance),
            'statut' => $statut, 'sent_at' => Carbon::parse($sentAt),
        ]);
    }

    private function seedAuditLogs(User $manager, User $g1, User $g2): void
    {
        $logs = [
            ['user_id' => $manager->id, 'user_email' => $manager->email, 'category' => 'auth', 'action' => 'Auth.login', 'severity' => 'info', 'target_type' => null, 'target_id' => null, 'target_label' => $manager->name, 'ip_address' => '105.66.12.34', 'created_at' => now()->subDays(7)->setHour(8)],
            ['user_id' => $manager->id, 'user_email' => $manager->email, 'category' => 'immeuble', 'action' => 'Residence.updated', 'severity' => 'info', 'target_type' => 'Residence', 'target_id' => 1, 'target_label' => 'Résidence Atlas', 'ip_address' => '105.66.12.34', 'created_at' => now()->subDays(7)->setHour(9)],
            ['user_id' => $g1->id, 'user_email' => $g1->email, 'category' => 'coproprietaire', 'action' => 'Coproprietaire.created', 'severity' => 'info', 'target_type' => 'Coproprietaire', 'target_id' => 15, 'target_label' => 'Khalid Bennani', 'ip_address' => '196.12.45.89', 'created_at' => now()->subDays(6)->setHour(10)],
            ['user_id' => $g1->id, 'user_email' => $g1->email, 'category' => 'paiement', 'action' => 'Paiement.created', 'severity' => 'info', 'target_type' => 'Paiement', 'target_id' => 30, 'target_label' => 'Lot A101 · 850,00 DH', 'ip_address' => '196.12.45.89', 'created_at' => now()->subDays(6)->setHour(11)],
            ['user_id' => $manager->id, 'user_email' => $manager->email, 'category' => 'budget', 'action' => 'Budget.approved', 'severity' => 'sensitive', 'target_type' => 'Budget', 'target_id' => 1, 'target_label' => 'Budget 2026 — Résidence Atlas', 'ip_address' => '105.66.12.34', 'created_at' => now()->subDays(5)->setHour(15)],
            ['user_id' => $g1->id, 'user_email' => $g1->email, 'category' => 'depense', 'action' => 'Depense.created', 'severity' => 'info', 'target_type' => 'Depense', 'target_id' => 10, 'target_label' => 'Facture nettoyage — 2 400 DH', 'ip_address' => '196.12.45.89', 'created_at' => now()->subDays(4)->setHour(9)],
            ['user_id' => null, 'user_email' => 'inconnu@fake.com', 'category' => 'auth', 'action' => 'Auth.failed_login', 'severity' => 'warning', 'target_type' => null, 'target_id' => null, 'target_label' => 'Tentative échouée', 'ip_address' => '197.230.45.12', 'created_at' => now()->subDays(3)->setHour(3)],
            ['user_id' => $manager->id, 'user_email' => $manager->email, 'category' => 'document', 'action' => 'Document.uploaded', 'severity' => 'info', 'target_type' => 'Document', 'target_id' => 5, 'target_label' => 'PV AG 2025.pdf', 'ip_address' => '105.66.12.34', 'created_at' => now()->subDays(3)->setHour(10)],
            ['user_id' => $g1->id, 'user_email' => $g1->email, 'category' => 'budget', 'action' => 'BilanOuverture.imported', 'severity' => 'sensitive', 'target_type' => 'BilanOuvertureLigne', 'target_id' => null, 'target_label' => 'Import bilan ouverture — 10 lignes', 'ip_address' => '196.12.45.89', 'created_at' => now()->subDays(2)->setHour(9)],
            ['user_id' => $g1->id, 'user_email' => $g1->email, 'category' => 'paiement', 'action' => 'Pointage.session_created', 'severity' => 'info', 'target_type' => 'PointageSession', 'target_id' => 1, 'target_label' => 'Pointage Attijari — 16 lignes', 'ip_address' => '196.12.45.89', 'created_at' => now()->subDays(2)->setHour(14)],
            ['user_id' => $g2->id, 'user_email' => $g2->email, 'category' => 'immeuble', 'action' => 'Equipement.created', 'severity' => 'info', 'target_type' => 'Equipement', 'target_id' => 1, 'target_label' => 'Ascenseur Schindler 3300', 'ip_address' => '196.12.45.89', 'created_at' => now()->subDays(1)->setHour(10)],
            ['user_id' => $manager->id, 'user_email' => $manager->email, 'category' => 'auth', 'action' => 'Auth.login', 'severity' => 'info', 'target_type' => null, 'target_id' => null, 'target_label' => $manager->name, 'ip_address' => '105.66.12.34', 'created_at' => now()->subHours(2)],
        ];

        foreach ($logs as $log) {
            AuditLog::create(array_merge($log, [
                'tenant_id' => $this->t,
                'user_agent' => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/125.0',
            ]));
        }
    }

    private function seedOccupants(Residence $residence, array $copros): void
    {
        $lots = $residence->lots()->take(10)->get();
        $occupantData = [
            ['nom' => 'Hassan Benali', 'tel' => '+212661000001', 'type' => 'proprietaire_occupant', 'debut' => '2020-01-15'],
            ['nom' => 'Ahmed Tazi', 'tel' => '+212662000002', 'type' => 'locataire', 'debut' => '2024-09-01', 'fin' => '2026-08-31'],
            ['nom' => 'Fatima Chraibi', 'tel' => '+212663000003', 'type' => 'proprietaire_occupant', 'debut' => '2019-06-01'],
            ['nom' => 'Rachid Bennani', 'tel' => '+212664000004', 'type' => 'locataire', 'debut' => '2025-01-01', 'fin' => '2026-12-31'],
            ['nom' => 'Amina Kettani', 'tel' => '+212665000005', 'type' => 'proprietaire_occupant', 'debut' => '2021-03-15'],
            ['nom' => 'Youssef Lahlou', 'tel' => '+212666000006', 'type' => 'usufruitier', 'debut' => '2023-07-01'],
            ['nom' => 'Nadia El Fassi', 'tel' => '+212667000007', 'type' => 'proprietaire_occupant', 'debut' => '2018-09-01'],
            ['nom' => 'Karim Senhaji', 'tel' => '+212668000008', 'type' => 'locataire', 'debut' => '2025-06-01', 'fin' => '2027-05-31'],
            ['nom' => 'Souad Filali', 'tel' => '+212669000009', 'type' => 'proprietaire_occupant', 'debut' => '2020-11-01'],
            ['nom' => 'Mehdi Cherkaoui', 'tel' => '+212660000010', 'type' => 'locataire', 'debut' => '2024-03-01', 'fin' => '2026-02-28'],
        ];

        foreach ($lots as $i => $lot) {
            if (!isset($occupantData[$i])) break;
            $d = $occupantData[$i];
            Occupant::create([
                'tenant_id' => $this->t, 'lot_id' => $lot->id,
                'coproprietaire_id' => $copros[$i]['copro']->id,
                'nom' => $d['nom'], 'telephone' => $d['tel'], 'type' => $d['type'],
                'date_debut' => $d['debut'], 'date_fin' => $d['fin'] ?? null,
            ]);
        }
    }

    private function seedPenaltyConfig(Residence $residence): void
    {
        PenaltyConfig::create([
            'residence_id' => $residence->id, 'enabled' => true, 'grace_period_days' => 15,
            'rate_type' => 'percentage', 'rate_value' => 5.00, 'cap_max_montant' => 5000.00,
            'ag_approved_at' => now()->subMonths(3),
        ]);
    }
}
