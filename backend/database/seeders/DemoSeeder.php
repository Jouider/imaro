<?php

namespace Database\Seeders;

use App\Models\Annonce;
use App\Models\AppelFonds;
use App\Models\Assemblee;
use App\Models\Budget;
use App\Models\Contrat;
use App\Models\Coproprietaire;
use App\Models\Depense;
use App\Models\Document;
use App\Models\Exercice;
use App\Models\Lot;
use App\Models\Notification;
use App\Models\Paiement;
use App\Models\PosteBudgetaire;
use App\Models\Prestataire;
use App\Models\Residence;
use App\Models\Tenant;
use App\Models\Ticket;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Database\Seeder;

class DemoSeeder extends Seeder
{
    public function run(): void
    {
        // ══════════════════════════════════════════════════════════
        // 1. TENANT — Cabinet syndic marocain
        // ══════════════════════════════════════════════════════════
        $tenant = Tenant::create([
            'name'       => 'Blanca Syndic',
            'email'      => 'contact@blancasyndic.ma',
            'phone'      => '+212522000001',
            'plan'       => 'business',
            'max_logins' => 500,
            'rc'         => 'RC-122735',
            'subdomain'  => 'blanca',
            'status'     => 'active',
        ]);

        $t = $tenant->id;
        config(['app.tenant_id' => $t]);

        // ══════════════════════════════════════════════════════════
        // 2. USERS — Staff (manager, gestionnaires, conseil)
        // ══════════════════════════════════════════════════════════
        $manager = User::create([
            'tenant_id' => $t,
            'name'      => 'Mohammed Fikri',
            'phone'     => '+212600000001',
            'email'     => 'fikri@blancasyndic.ma',
            'password'  => bcrypt('imaro2026'),
            'role'      => 'manager',
            'status'    => 'active',
        ]);
        $manager->assignRole('manager');

        $gestionnaire1 = User::create([
            'tenant_id' => $t,
            'name'      => 'Karim Alaoui',
            'phone'     => '+212600000002',
            'email'     => 'alaoui@blancasyndic.ma',
            'password'  => bcrypt('imaro2026'),
            'role'      => 'gestionnaire',
            'status'    => 'active',
            'notification_prefs' => ['paiement' => true, 'ticket' => true, 'assemblee' => true, 'retard' => true],
        ]);
        $gestionnaire1->assignRole('gestionnaire');

        $gestionnaire2 = User::create([
            'tenant_id' => $t,
            'name'      => 'Leila Mansouri',
            'phone'     => '+212600000003',
            'email'     => 'mansouri@blancasyndic.ma',
            'password'  => bcrypt('imaro2026'),
            'role'      => 'gestionnaire',
            'status'    => 'active',
            'notification_prefs' => ['paiement' => true, 'ticket' => true, 'assemblee' => false, 'retard' => true],
        ]);
        $gestionnaire2->assignRole('gestionnaire');

        $conseil = User::create([
            'tenant_id' => $t,
            'name'      => 'Driss El Fassi',
            'phone'     => '+212600000004',
            'email'     => 'elfassi@email.ma',
            'password'  => bcrypt('imaro2026'),
            'role'      => 'conseil',
            'status'    => 'active',
        ]);
        $conseil->assignRole('conseil');

        // ══════════════════════════════════════════════════════════
        // 3. RÉSIDENCES — 2 résidences à Casablanca
        // ══════════════════════════════════════════════════════════
        $residence1 = Residence::withoutGlobalScope('tenant')->create([
            'tenant_id'       => $t,
            'gestionnaire_id' => $gestionnaire1->id,
            'name'            => 'Résidence Atlas',
            'address'         => '12 Boulevard Zerktouni, Maârif',
            'city'            => 'Casablanca',
            'total_tantieme'  => 1000,
            'nb_lots'         => 20,
            'status'          => 'active',
        ]);

        $residence2 = Residence::withoutGlobalScope('tenant')->create([
            'tenant_id'       => $t,
            'gestionnaire_id' => $gestionnaire2->id,
            'name'            => 'Résidence Anfa Gardens',
            'address'         => '45 Rue des Palmiers, Anfa',
            'city'            => 'Casablanca',
            'total_tantieme'  => 1000,
            'nb_lots'         => 10,
            'status'          => 'active',
        ]);

        // ══════════════════════════════════════════════════════════
        // 4. EXERCICES — 2025 (clôturé) + 2026 (actif)
        // ══════════════════════════════════════════════════════════
        $exercice2025 = Exercice::withoutGlobalScope('tenant')->create([
            'tenant_id'    => $t,
            'residence_id' => $residence1->id,
            'annee'        => 2025,
            'date_debut'   => '2025-01-01',
            'date_fin'     => '2025-12-31',
            'statut'       => 'cloture',
        ]);

        $exercice2026 = Exercice::withoutGlobalScope('tenant')->create([
            'tenant_id'    => $t,
            'residence_id' => $residence1->id,
            'annee'        => 2026,
            'date_debut'   => '2026-01-01',
            'date_fin'     => '2026-12-31',
            'statut'       => 'actif',
        ]);

        $exerciceAnfa = Exercice::withoutGlobalScope('tenant')->create([
            'tenant_id'    => $t,
            'residence_id' => $residence2->id,
            'annee'        => 2026,
            'date_debut'   => '2026-01-01',
            'date_fin'     => '2026-12-31',
            'statut'       => 'actif',
        ]);

        // ══════════════════════════════════════════════════════════
        // 5. LOTS + COPROPRIÉTAIRES — Résidence Atlas (20 lots)
        // ══════════════════════════════════════════════════════════
        $nomsAtlas = [
            'Hassan Benali', 'Fatima Chraibi', 'Youssef Tazi',
            'Nadia Berrada', 'Omar Fassi', 'Amina Kettani',
            'Rachid Squalli', 'Houda Lahlou', 'Mehdi Bensouda',
            'Souad El Amrani', 'Khalid Bennani', 'Zineb Tahiri',
            'Samir Cherkaoui', 'Khadija Benhaddou', 'Adil Ziani',
            'Meriem Ouazzani', 'Tariq Lamrani', 'Hafida Ghazi',
            'Younes Sabri', 'Rajaa Filali',
        ];

        $tantiemesAtlas = [
            65, 55, 50, 50, 50, 50, 50, 50, 50, 50,
            50, 50, 50, 50, 50, 50, 45, 45, 45, 45,
        ];

        $typesLot  = ['appartement', 'appartement', 'appartement', 'local_commercial', 'appartement'];
        $phonesRes = [
            '+212661000001', '+212662000002', '+212663000003', '+212664000004',
            '+212665000005', '+212666000006', '+212667000007', '+212668000008',
            '+212669000009', '+212660100010', '+212661100011', '+212662100012',
            '+212663100013', '+212664100014', '+212665100015', '+212666100016',
            '+212667100017', '+212668100018', '+212669100019', '+212660200020',
        ];

        $coproprietairesAtlas = [];

        foreach ($nomsAtlas as $i => $nom) {
            $lot = Lot::create([
                'tenant_id'    => $t,
                'residence_id' => $residence1->id,
                'numero'       => $i < 16 ? 'A'.($i + 101) : 'B'.($i - 15),
                'etage'        => (int) floor($i / 4) + 1,
                'type'         => $typesLot[$i % count($typesLot)],
                'superficie'   => rand(55, 130),
                'tantieme'     => $tantiemesAtlas[$i],
            ]);

            $user = User::create([
                'tenant_id' => $t,
                'name'      => $nom,
                'phone'     => $phonesRes[$i],
                'email'     => strtolower(str_replace(' ', '.', $nom)).'@email.ma',
                'role'      => 'resident',
                'status'    => 'active',
                'password'  => bcrypt('resident2026'),
            ]);
            $user->assignRole('resident');

            $copro = Coproprietaire::create([
                'tenant_id'    => $t,
                'user_id'      => $user->id,
                'lot_id'       => $lot->id,
                'type'         => $i < 17 ? 'proprietaire' : 'locataire',
                'date_entree'  => now()->subMonths(rand(6, 36)),
                'solde_actuel' => 0,
            ]);

            $coproprietairesAtlas[] = ['copro' => $copro, 'lot' => $lot, 'user' => $user];
        }

        // ── Lots + Copropriétaires — Résidence Anfa Gardens (10 lots) ──
        $nomsAnfa = [
            'Amine Benjelloun', 'Salma Touzani', 'Hamza El Idrissi',
            'Layla Senhaji', 'Mustapha Alami', 'Ghita Bouzid',
            'Reda Chafik', 'Imane Kabbaj', 'Tarik El Ouardi', 'Samira Hassani',
        ];

        $tantiemesAnfa = [120, 110, 100, 100, 100, 100, 90, 90, 100, 90];

        $coproprietairesAnfa = [];

        foreach ($nomsAnfa as $i => $nom) {
            $lot = Lot::create([
                'tenant_id'    => $t,
                'residence_id' => $residence2->id,
                'numero'       => 'C'.($i + 201),
                'etage'        => (int) floor($i / 3) + 1,
                'type'         => $i === 9 ? 'local_commercial' : 'appartement',
                'superficie'   => rand(75, 160),
                'tantieme'     => $tantiemesAnfa[$i],
            ]);

            $user = User::create([
                'tenant_id' => $t,
                'name'      => $nom,
                'phone'     => '+21267'.str_pad($i + 30, 7, '0', STR_PAD_LEFT),
                'email'     => strtolower(str_replace(' ', '.', $nom)).'@email.ma',
                'role'      => 'resident',
                'status'    => 'active',
                'password'  => bcrypt('resident2026'),
            ]);
            $user->assignRole('resident');

            $copro = Coproprietaire::create([
                'tenant_id'    => $t,
                'user_id'      => $user->id,
                'lot_id'       => $lot->id,
                'type'         => 'proprietaire',
                'date_entree'  => now()->subMonths(rand(3, 24)),
                'solde_actuel' => 0,
            ]);

            $coproprietairesAnfa[] = ['copro' => $copro, 'lot' => $lot, 'user' => $user];
        }

        // ══════════════════════════════════════════════════════════
        // 6. PRESTATAIRES — Fournisseurs marocains
        // ══════════════════════════════════════════════════════════
        $prestataires = [];

        $prestataires[] = Prestataire::create([
            'tenant_id'        => $t,
            'nom'              => 'Atlas Ascenseurs SARL',
            'telephone'        => '+212522334455',
            'email'            => 'contact@atlasascenseurs.ma',
            // 'adresse'       => '22 Rue Ibnou Khaldoun, Maârif, Casablanca',
            'specialite'       => 'ascenseur',
            'note_moyenne'     => 4.2,
            'nb_interventions' => 12,
            'statut'           => 'actif',
        ]);

        $prestataires[] = Prestataire::create([
            'tenant_id'        => $t,
            'nom'              => 'ProClean Services',
            'telephone'        => '+212661778899',
            'email'            => 'info@proclean.ma',
            // 'adresse'       => '8 Avenue Hassan II, Aïn Diab, Casablanca',
            'specialite'       => 'nettoyage',
            'note_moyenne'     => 3.8,
            'nb_interventions' => 24,
            'statut'           => 'actif',
        ]);

        $prestataires[] = Prestataire::create([
            'tenant_id'        => $t,
            'nom'              => 'Bab Plomberie & Chauffage',
            'telephone'        => '+212600556677',
            'email'            => 'bab.plomberie@gmail.com',
            // 'adresse'       => '35 Derb Sultan, Casablanca',
            'specialite'       => 'plomberie',
            'note_moyenne'     => 4.5,
            'nb_interventions' => 8,
            'statut'           => 'actif',
        ]);

        $prestataires[] = Prestataire::create([
            'tenant_id'        => $t,
            'nom'              => 'Garde Sécurité Maroc',
            'telephone'        => '+212522889900',
            'email'            => 'rh@gardesecurite.ma',
            // 'adresse'       => 'Zone Industrielle Aïn Sebaâ, Casablanca',
            'specialite'       => 'gardiennage',
            'note_moyenne'     => 4.0,
            'nb_interventions' => 36,
            'statut'           => 'actif',
        ]);

        $prestataires[] = Prestataire::create([
            'tenant_id'        => $t,
            'nom'              => 'Jardins du Sud',
            'telephone'        => '+212661223344',
            'email'            => 'contact@jardinsdusud.ma',
            // 'adresse'       => '12 Rue des Roses, Californie, Casablanca',
            'specialite'       => 'espaces_verts',
            'note_moyenne'     => 3.5,
            'nb_interventions' => 6,
            'statut'           => 'inactif',
        ]);

        $prestataires[] = Prestataire::create([
            'tenant_id'        => $t,
            'nom'              => 'Kahraba Express',
            'telephone'        => '+212661990011',
            'email'            => 'kahraba.express@gmail.com',
            // 'adresse'       => '7 Rue Moulay Ismail, Bourgogne, Casablanca',
            'specialite'       => 'electricite',
            'note_moyenne'     => 4.3,
            'nb_interventions' => 15,
            'statut'           => 'actif',
        ]);

        $prestataires[] = Prestataire::create([
            'tenant_id'        => $t,
            'nom'              => 'Wiqaya Assurance',
            'telephone'        => '+212522445566',
            'email'            => 'syndic@wiqaya.ma',
            // 'adresse'       => '10 Boulevard Moulay Youssef, Casablanca',
            'specialite'       => 'assurance',
            'note_moyenne'     => 4.0,
            'nb_interventions' => 2,
            'statut'           => 'actif',
        ]);

        // ══════════════════════════════════════════════════════════
        // 7. CONTRATS — Actifs, expirés, bientôt expirés
        // ══════════════════════════════════════════════════════════
        Contrat::create([
            'tenant_id'          => $t,
            'residence_id'       => $residence1->id,
            'prestataire_id'     => $prestataires[3]->id,
            'titre'              => 'Gardiennage Résidence Atlas 2026',
            'type'               => 'gardiennage',
            'montant'            => 60000,
            'date_debut'         => '2026-01-01',
            'date_fin'           => '2026-12-31',
            'statut'             => 'actif',
            'renouvellement_auto' => true,
        ]);

        Contrat::create([
            'tenant_id'          => $t,
            'residence_id'       => $residence1->id,
            'prestataire_id'     => $prestataires[1]->id,
            'titre'              => 'Nettoyage parties communes Atlas',
            'type'               => 'nettoyage',
            'montant'            => 36000,
            'date_debut'         => '2026-01-01',
            'date_fin'           => '2026-12-31',
            'statut'             => 'actif',
            'renouvellement_auto' => true,
        ]);

        Contrat::create([
            'tenant_id'          => $t,
            'residence_id'       => $residence1->id,
            'prestataire_id'     => $prestataires[0]->id,
            'titre'              => 'Maintenance ascenseur Atlas',
            'type'               => 'maintenance',
            'montant'            => 24000,
            'date_debut'         => '2026-03-01',
            'date_fin'           => '2027-02-28',
            'statut'             => 'actif',
            'renouvellement_auto' => false,
        ]);

        Contrat::create([
            'tenant_id'          => $t,
            'residence_id'       => $residence1->id,
            'prestataire_id'     => $prestataires[4]->id,
            'titre'              => 'Entretien jardin Atlas (expiré)',
            'type'               => 'autre',
            'montant'            => 18000,
            'date_debut'         => '2025-06-01',
            'date_fin'           => '2026-05-31',
            'statut'             => 'expire',
            'renouvellement_auto' => false,
        ]);

        Contrat::create([
            'tenant_id'          => $t,
            'residence_id'       => $residence1->id,
            'prestataire_id'     => $prestataires[6]->id,
            'titre'              => 'Assurance multirisque Atlas',
            'type'               => 'autre',
            'montant'            => 8000,
            'date_debut'         => '2026-01-01',
            'date_fin'           => '2026-12-31',
            'statut'             => 'actif',
            'renouvellement_auto' => true,
        ]);

        Contrat::create([
            'tenant_id'          => $t,
            'residence_id'       => $residence2->id,
            'prestataire_id'     => $prestataires[3]->id,
            'titre'              => 'Gardiennage Anfa Gardens 2026',
            'type'               => 'gardiennage',
            'montant'            => 48000,
            'date_debut'         => '2026-01-01',
            'date_fin'           => '2026-12-31',
            'statut'             => 'actif',
            'renouvellement_auto' => true,
        ]);

        Contrat::create([
            'tenant_id'          => $t,
            'residence_id'       => $residence2->id,
            'prestataire_id'     => $prestataires[5]->id,
            'titre'              => 'Maintenance électrique Anfa',
            'type'               => 'maintenance',
            'montant'            => 15000,
            'date_debut'         => '2026-04-01',
            'date_fin'           => '2026-09-30',
            'statut'             => 'actif',
            'renouvellement_auto' => false,
        ]);

        // ══════════════════════════════════════════════════════════
        // 8. BUDGETS + POSTES BUDGÉTAIRES
        // ══════════════════════════════════════════════════════════
        $budgetAtlas = Budget::create([
            'tenant_id'    => $t,
            'residence_id' => $residence1->id,
            'exercice_id'  => $exercice2026->id,
            'statut'       => 'approuve',
            'approuve_at'  => '2026-01-15',
        ]);

        $postesAtlas = [
            ['categorie' => 'gardiennage',   'description' => 'Salaire gardien + charges sociales',         'montant_prevu' => 60000, 'montant_realise' => 25000],
            ['categorie' => 'nettoyage',     'description' => 'Nettoyage parties communes bi-hebdo',        'montant_prevu' => 36000, 'montant_realise' => 15000],
            ['categorie' => 'entretien',     'description' => 'Contrat maintenance ascenseur Schindler',    'montant_prevu' => 24000, 'montant_realise' => 10000],
            ['categorie' => 'entretien',     'description' => 'Éclairage parties communes + ampoules',     'montant_prevu' => 18000, 'montant_realise' => 7500],
            ['categorie' => 'entretien',     'description' => 'Consommation eau commune (LYDEC)',           'montant_prevu' => 14000, 'montant_realise' => 6200],
            ['categorie' => 'entretien',     'description' => 'Consommation électricité (LYDEC)',           'montant_prevu' => 10000, 'montant_realise' => 4300],
            ['categorie' => 'assurance',     'description' => 'Assurance multirisque immeuble (Wiqaya)',    'montant_prevu' => 8000,  'montant_realise' => 8000],
            ['categorie' => 'administratif', 'description' => 'Honoraires syndic + frais courrier',         'montant_prevu' => 12000, 'montant_realise' => 5000],
            ['categorie' => 'travaux',       'description' => 'Ravalement façade (prévu été 2026)',         'montant_prevu' => 25000, 'montant_realise' => 0],
            ['categorie' => 'autre',         'description' => 'Imprévus et divers',                         'montant_prevu' => 5000,  'montant_realise' => 1800],
        ];

        foreach ($postesAtlas as $p) {
            PosteBudgetaire::create(array_merge($p, ['budget_id' => $budgetAtlas->id]));
        }

        $budgetAnfa = Budget::create([
            'tenant_id'    => $t,
            'residence_id' => $residence2->id,
            'exercice_id'  => $exerciceAnfa->id,
            'statut'       => 'brouillon',
        ]);

        $postesAnfa = [
            ['categorie' => 'gardiennage',   'description' => 'Gardiennage 24h/24',                'montant_prevu' => 48000, 'montant_realise' => 0],
            ['categorie' => 'nettoyage',     'description' => 'Nettoyage + désinfection hebdo',     'montant_prevu' => 24000, 'montant_realise' => 0],
            ['categorie' => 'entretien',     'description' => 'Maintenance piscine',                'montant_prevu' => 18000, 'montant_realise' => 0],
            ['categorie' => 'entretien',     'description' => 'Espaces verts',                      'montant_prevu' => 12000, 'montant_realise' => 0],
            ['categorie' => 'assurance',     'description' => 'Assurance multirisque',              'montant_prevu' => 6000,  'montant_realise' => 0],
        ];

        foreach ($postesAnfa as $p) {
            PosteBudgetaire::create(array_merge($p, ['budget_id' => $budgetAnfa->id]));
        }

        // ══════════════════════════════════════════════════════════
        // 9. APPELS DE FONDS — Q1 (soldé) + Q2 (partiel)
        // ══════════════════════════════════════════════════════════
        $appelQ1 = AppelFonds::withoutGlobalScope('tenant')->create([
            'tenant_id'     => $t,
            'residence_id'  => $residence1->id,
            'exercice_id'   => $exercice2026->id,
            'created_by'    => $gestionnaire1->id,
            'libelle'       => 'Charges trimestrielles Q1 2026',
            'description'   => 'Charges communes : gardiennage, ascenseur, nettoyage, LYDEC (jan-mars)',
            'montant_total' => 15000,
            'date_echeance' => Carbon::parse('2026-03-31'),
            'statut'        => 'solde',
            'sent_at'       => Carbon::parse('2026-01-05'),
        ]);
        $appelQ1->genererLignes();

        // Payer toutes les lignes Q1
        $lignesQ1 = $appelQ1->lignes()->with('coproprietaire')->get();
        $modes = ['virement', 'cheque', 'especes', 'virement', 'virement'];
        foreach ($lignesQ1 as $i => $ligne) {
            Paiement::create([
                'tenant_id'            => $t,
                'exercice_id'          => $exercice2026->id,
                'coproprietaire_id'    => $ligne->coproprietaire_id,
                'appel_fonds_ligne_id' => $ligne->id,
                'saisi_par'            => $gestionnaire1->id,
                'montant'              => $ligne->montant_du,
                'mode'                 => $modes[$i % count($modes)],
                'reference'            => 'PAY-2026-'.str_pad($i + 1, 4, '0', STR_PAD_LEFT),
                'date_paiement'        => Carbon::parse('2026-0'.rand(1, 3).'-'.rand(5, 28)),
            ]);
            $ligne->update(['montant_paye' => $ligne->montant_du, 'statut' => 'paye', 'date_paiement' => now()->subDays(rand(30, 90))]);
            $ligne->coproprietaire->recalculerSolde();
        }

        $appelQ2 = AppelFonds::withoutGlobalScope('tenant')->create([
            'tenant_id'     => $t,
            'residence_id'  => $residence1->id,
            'exercice_id'   => $exercice2026->id,
            'created_by'    => $gestionnaire1->id,
            'libelle'       => 'Charges trimestrielles Q2 2026',
            'description'   => 'Charges communes : gardiennage, ascenseur, nettoyage, LYDEC (avr-juin)',
            'montant_total' => 18000,
            'date_echeance' => Carbon::parse('2026-06-30'),
            'statut'        => 'envoye',
            'sent_at'       => Carbon::parse('2026-04-01'),
        ]);
        $appelQ2->genererLignes();

        // Q2 : 15 payés, 5 impayés
        $lignesQ2 = $appelQ2->lignes()->with('coproprietaire')->get();
        foreach ($lignesQ2->take(15) as $i => $ligne) {
            Paiement::create([
                'tenant_id'            => $t,
                'exercice_id'          => $exercice2026->id,
                'coproprietaire_id'    => $ligne->coproprietaire_id,
                'appel_fonds_ligne_id' => $ligne->id,
                'saisi_par'            => $gestionnaire1->id,
                'montant'              => $ligne->montant_du,
                'mode'                 => $modes[$i % count($modes)],
                'reference'            => 'PAY-2026-'.str_pad($i + 21, 4, '0', STR_PAD_LEFT),
                'date_paiement'        => now()->subDays(rand(5, 30)),
            ]);
            $ligne->update(['montant_paye' => $ligne->montant_du, 'statut' => 'paye', 'date_paiement' => now()->subDays(rand(5, 30))]);
            $ligne->coproprietaire->recalculerSolde();
        }
        // 2 paiements partiels
        foreach ($lignesQ2->skip(15)->take(2) as $ligne) {
            $montantPartiel = round($ligne->montant_du * 0.4, 2);
            Paiement::create([
                'tenant_id'            => $t,
                'exercice_id'          => $exercice2026->id,
                'coproprietaire_id'    => $ligne->coproprietaire_id,
                'appel_fonds_ligne_id' => $ligne->id,
                'saisi_par'            => $gestionnaire1->id,
                'montant'              => $montantPartiel,
                'mode'                 => 'especes',
                'reference'            => 'PAY-2026-PART-'.str_pad($ligne->id, 3, '0', STR_PAD_LEFT),
                'date_paiement'        => now()->subDays(10),
            ]);
            $ligne->update(['montant_paye' => $montantPartiel, 'statut' => 'partiel']);
            $ligne->coproprietaire->recalculerSolde();
        }
        // 3 totalement impayés
        foreach ($lignesQ2->skip(17) as $ligne) {
            $ligne->coproprietaire->recalculerSolde();
        }
        $appelQ2->update(['statut' => 'partiel']);

        // Appel Anfa Gardens
        $appelAnfa = AppelFonds::withoutGlobalScope('tenant')->create([
            'tenant_id'     => $t,
            'residence_id'  => $residence2->id,
            'exercice_id'   => $exerciceAnfa->id,
            'created_by'    => $gestionnaire2->id,
            'libelle'       => 'Charges semestrielles S1 2026 — Anfa',
            'description'   => 'Gardiennage, nettoyage, piscine, espaces verts (jan-juin)',
            'montant_total' => 25000,
            'date_echeance' => Carbon::parse('2026-06-30'),
            'statut'        => 'envoye',
            'sent_at'       => Carbon::parse('2026-01-10'),
        ]);
        $appelAnfa->genererLignes();

        // 7/10 payés
        $lignesAnfa = $appelAnfa->lignes()->with('coproprietaire')->get();
        foreach ($lignesAnfa->take(7) as $i => $ligne) {
            Paiement::create([
                'tenant_id'            => $t,
                'exercice_id'          => $exerciceAnfa->id,
                'coproprietaire_id'    => $ligne->coproprietaire_id,
                'appel_fonds_ligne_id' => $ligne->id,
                'saisi_par'            => $gestionnaire2->id,
                'montant'              => $ligne->montant_du,
                'mode'                 => $modes[$i % count($modes)],
                'reference'            => 'PAY-ANFA-'.str_pad($i + 1, 4, '0', STR_PAD_LEFT),
                'date_paiement'        => now()->subDays(rand(10, 50)),
            ]);
            $ligne->update(['montant_paye' => $ligne->montant_du, 'statut' => 'paye']);
            $ligne->coproprietaire->recalculerSolde();
        }
        foreach ($lignesAnfa->skip(7) as $ligne) {
            $ligne->coproprietaire->recalculerSolde();
        }
        $appelAnfa->update(['statut' => 'partiel']);

        // ══════════════════════════════════════════════════════════
        // 10. DÉPENSES — Charges réelles comptabilisées
        // ══════════════════════════════════════════════════════════
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

        foreach ($depensesData as $d) {
            Depense::create([
                'tenant_id'      => $t,
                'exercice_id'    => $exercice2026->id,
                'residence_id'   => $residence1->id,
                'prestataire_id' => $d['prest'] !== null ? $prestataires[$d['prest']]->id : null,
                'created_by'     => $gestionnaire1->id,
                'description'    => $d['desc'],
                'categorie'      => $d['cat'],
                'montant'        => $d['montant'],
                'date'           => $d['date'],
                'statut'         => $d['statut'],
            ]);
        }

        // ══════════════════════════════════════════════════════════
        // 11. TICKETS — Variété de catégories et statuts
        // ══════════════════════════════════════════════════════════
        Ticket::create([
            'tenant_id'    => $t,
            'residence_id' => $residence1->id,
            'user_id'      => $coproprietairesAtlas[0]['user']->id,
            'lot_id'       => $coproprietairesAtlas[0]['lot']->id,
            'categorie'    => 'ascenseur',
            'description'  => "L'ascenseur est bloqué au 3ème étage depuis ce matin. Les résidents âgés ne peuvent pas monter. Très urgent svp.",
            'priorite'     => 'urgent',
            'statut'       => 'ouvert',
        ]);

        Ticket::create([
            'tenant_id'    => $t,
            'residence_id' => $residence1->id,
            'user_id'      => $coproprietairesAtlas[3]['user']->id,
            'lot_id'       => $coproprietairesAtlas[3]['lot']->id,
            'categorie'    => 'plomberie',
            'description'  => "Fuite d'eau au plafond du 2ème étage, couloir B. L'eau coule depuis hier soir et abîme la peinture.",
            'priorite'     => 'normal',
            'statut'       => 'en_cours',
        ]);

        Ticket::create([
            'tenant_id'    => $t,
            'residence_id' => $residence1->id,
            'user_id'      => $coproprietairesAtlas[7]['user']->id,
            'lot_id'       => $coproprietairesAtlas[7]['lot']->id,
            'categorie'    => 'proprete',
            'description'  => "Les poubelles du RDC débordent depuis 2 jours. Odeur insupportable. Contacter la société de nettoyage svp.",
            'priorite'     => 'faible',
            'statut'       => 'ouvert',
        ]);

        Ticket::create([
            'tenant_id'    => $t,
            'residence_id' => $residence1->id,
            'user_id'      => $coproprietairesAtlas[11]['user']->id,
            'lot_id'       => $coproprietairesAtlas[11]['lot']->id,
            'categorie'    => 'electricite',
            'description'  => "L'éclairage du parking sous-sol ne fonctionne plus depuis 3 jours. C'est dangereux le soir.",
            'priorite'     => 'urgent',
            'statut'       => 'en_cours',
            'created_at'   => now()->subDays(5),
        ]);

        Ticket::create([
            'tenant_id'    => $t,
            'residence_id' => $residence1->id,
            'user_id'      => $coproprietairesAtlas[15]['user']->id,
            'lot_id'       => $coproprietairesAtlas[15]['lot']->id,
            'categorie'    => 'securite',
            'description'  => "La porte d'entrée principale ne ferme plus correctement. Le système de badge est en panne.",
            'priorite'     => 'normal',
            'statut'       => 'ouvert',
            'created_at'   => now()->subDays(2),
        ]);

        Ticket::create([
            'tenant_id'    => $t,
            'residence_id' => $residence1->id,
            'user_id'      => $coproprietairesAtlas[5]['user']->id,
            'lot_id'       => $coproprietairesAtlas[5]['lot']->id,
            'categorie'    => 'plomberie',
            'description'  => "Problème d'évacuation eaux usées au RDC. Remontée d'odeurs dans le hall. Intervention urgente nécessaire.",
            'priorite'     => 'urgent',
            'statut'       => 'resolu',
            'closed_at'    => now()->subDays(3),
            'created_at'   => now()->subDays(10),
        ]);

        Ticket::create([
            'tenant_id'    => $t,
            'residence_id' => $residence2->id,
            'user_id'      => $coproprietairesAnfa[2]['user']->id,
            'lot_id'       => $coproprietairesAnfa[2]['lot']->id,
            'categorie'    => 'proprete',
            'description'  => "La piscine n'a pas été nettoyée depuis 2 semaines. L'eau est verte. Les résidents se plaignent.",
            'priorite'     => 'normal',
            'statut'       => 'ouvert',
        ]);

        // ══════════════════════════════════════════════════════════
        // 12. ANNONCES — Variété de statuts et priorités
        // ══════════════════════════════════════════════════════════
        Annonce::create([
            'tenant_id'    => $t,
            'residence_id' => $residence1->id,
            'created_by'   => $gestionnaire1->id,
            'titre'        => 'Coupure d\'eau prévue — LYDEC',
            'contenu'      => "Chers copropriétaires,\n\nLa LYDEC effectuera des travaux de maintenance sur le réseau d'eau le mardi 20 mai de 8h à 14h.\n\nMerci de prévoir vos réserves d'eau à l'avance.\n\nCordialement,\nLa Gestion",
            'priorite'     => 'urgente',
            'statut'       => 'publiee',
            'publiee_at'   => now()->subDays(2),
        ]);

        Annonce::create([
            'tenant_id'    => $t,
            'residence_id' => $residence1->id,
            'created_by'   => $gestionnaire1->id,
            'titre'        => 'Convocation AG Ordinaire — 14 juin 2026',
            'contenu'      => "L'Assemblée Générale Ordinaire de la copropriété Résidence Atlas se tiendra le samedi 14 juin 2026 à 15h00 dans la salle de réunion au RDC.\n\nOrdre du jour :\n1. Approbation des comptes 2025\n2. Budget prévisionnel 2026\n3. Travaux de ravalement façade\n4. Remplacement pompe eau\n5. Questions diverses\n\nVotre présence est indispensable (quorum requis : 50%).\nEn cas d'absence, merci de transmettre votre procuration.",
            'priorite'     => 'urgente',
            'statut'       => 'publiee',
            'publiee_at'   => now()->subDays(7),
        ]);

        Annonce::create([
            'tenant_id'    => $t,
            'residence_id' => $residence1->id,
            'created_by'   => $gestionnaire2->id,
            'titre'        => 'Nouveau règlement parking sous-sol',
            'contenu'      => "Suite aux incidents répétés au parking sous-sol, nous rappelons les règles suivantes :\n\n- Chaque lot dispose d'une seule place numérotée\n- Vitesse limitée à 10 km/h\n- Interdiction de stocker des objets hors de votre place\n- Le parking ferme à 23h00\n\nTout manquement sera signalé au conseil syndical. Réf: Article 24 du règlement de copropriété.",
            'priorite'     => 'normale',
            'statut'       => 'publiee',
            'publiee_at'   => now()->subDays(14),
        ]);

        Annonce::create([
            'tenant_id'    => $t,
            'residence_id' => null,
            'created_by'   => $manager->id,
            'titre'        => 'Bienvenue sur la plateforme imaro',
            'contenu'      => "Chers résidents,\n\nBienvenue sur la plateforme imaro ! Vous pouvez désormais :\n- Consulter vos charges et paiements\n- Payer en ligne (bientôt)\n- Soumettre vos réclamations\n- Recevoir les annonces en temps réel\n\nL'équipe Blanca Syndic",
            'priorite'     => 'normale',
            'statut'       => 'publiee',
            'publiee_at'   => now()->subDays(30),
        ]);

        Annonce::create([
            'tenant_id'    => $t,
            'residence_id' => $residence1->id,
            'created_by'   => $gestionnaire1->id,
            'titre'        => 'Travaux ravalement façade — devis en cours',
            'contenu'      => "Suite à l'AG du 14 juin, les devis pour le ravalement de la façade sont en cours de collecte. 3 entreprises ont été contactées. Les résultats seront communiqués lors de l'AG extraordinaire du 20 juillet.",
            'priorite'     => 'normale',
            'statut'       => 'brouillon',
        ]);

        Annonce::create([
            'tenant_id'    => $t,
            'residence_id' => $residence2->id,
            'created_by'   => $gestionnaire2->id,
            'titre'        => 'Fermeture piscine pour maintenance',
            'contenu'      => "La piscine de la résidence Anfa Gardens sera fermée du 25 au 30 mai pour nettoyage en profondeur et traitement chimique.\n\nMerci de votre compréhension.",
            'priorite'     => 'normale',
            'statut'       => 'publiee',
            'publiee_at'   => now()->subDays(1),
        ]);

        // ══════════════════════════════════════════════════════════
        // 13. ASSEMBLÉES — Passées et futures
        // ══════════════════════════════════════════════════════════
        Assemblee::create([
            'tenant_id'      => $t,
            'residence_id'   => $residence1->id,
            'created_by'     => $gestionnaire1->id,
            'titre'          => 'AG Ordinaire 2026',
            'type'           => 'ordinaire',
            'date'           => '2026-06-14 15:00:00',
            'lieu'           => 'Salle de réunion RDC, Résidence Atlas',
            'quorum_requis'  => 50,
            'ordre_du_jour'  => "Approbation des comptes 2025\nBudget prévisionnel 2026\nTravaux de ravalement façade\nRemplacement pompe eau commune\nQuestions diverses",
            'statut'         => 'planifiee',
        ]);

        Assemblee::create([
            'tenant_id'      => $t,
            'residence_id'   => $residence1->id,
            'created_by'     => $gestionnaire1->id,
            'titre'          => 'AG Extraordinaire — Travaux toiture',
            'type'           => 'extraordinaire',
            'date'           => '2026-07-20 10:00:00',
            'lieu'           => 'Salle de réunion RDC, Résidence Atlas',
            'quorum_requis'  => 66,
            'ordre_du_jour'  => "Présentation devis travaux toiture terrasse\nVote sur le prestataire retenu\nModalités de financement (appel exceptionnel)\nCalendrier des travaux",
            'statut'         => 'planifiee',
        ]);

        Assemblee::create([
            'tenant_id'       => $t,
            'residence_id'    => $residence1->id,
            'created_by'      => $gestionnaire1->id,
            'titre'           => 'AG Ordinaire 2025',
            'type'            => 'ordinaire',
            'date'            => '2025-06-20 15:00:00',
            'lieu'            => 'Salle de réunion RDC, Résidence Atlas',
            'quorum_requis'   => 50,
            'ordre_du_jour'   => "Approbation des comptes 2024\nBudget prévisionnel 2025\nÉlection nouveau conseil syndical\nQuestions diverses",
            'statut'          => 'tenue',
            'quorum_atteint'  => true,
        ]);

        Assemblee::create([
            'tenant_id'      => $t,
            'residence_id'   => $residence2->id,
            'created_by'     => $gestionnaire2->id,
            'titre'          => 'AG Ordinaire Anfa Gardens 2026',
            'type'           => 'ordinaire',
            'date'           => '2026-06-28 16:00:00',
            'lieu'           => 'Salon commun, Résidence Anfa Gardens',
            'quorum_requis'  => 50,
            'ordre_du_jour'  => "Approbation des comptes 2025\nBudget prévisionnel 2026\nRénovation piscine\nInstallation vidéosurveillance\nQuestions diverses",
            'statut'         => 'planifiee',
        ]);

        // ══════════════════════════════════════════════════════════
        // 14. DOCUMENTS — PV, règlements, contrats, factures
        // ══════════════════════════════════════════════════════════
        $docs = [
            ['nom' => 'PV AG Ordinaire 2025',                   'type' => 'pv_ag',     'res' => $residence1->id, 'by' => $gestionnaire1->id, 'ko' => 245,  'date' => '2025-06-25'],
            ['nom' => 'Règlement de copropriété — Atlas',       'type' => 'reglement', 'res' => $residence1->id, 'by' => $gestionnaire1->id, 'ko' => 1240, 'date' => '2020-03-15'],
            ['nom' => 'Règlement intérieur — Atlas',            'type' => 'reglement', 'res' => $residence1->id, 'by' => $gestionnaire1->id, 'ko' => 180,  'date' => '2024-01-15'],
            ['nom' => 'Contrat gardiennage 2026',               'type' => 'contrat',   'res' => $residence1->id, 'by' => $gestionnaire1->id, 'ko' => 320,  'date' => '2026-01-05'],
            ['nom' => 'Contrat nettoyage ProClean 2026',        'type' => 'contrat',   'res' => $residence1->id, 'by' => $gestionnaire1->id, 'ko' => 280,  'date' => '2026-01-05'],
            ['nom' => 'Facture LYDEC eau Q1 2026',              'type' => 'facture',   'res' => $residence1->id, 'by' => $gestionnaire1->id, 'ko' => 85,   'date' => '2026-04-05'],
            ['nom' => 'Facture LYDEC électricité Q1 2026',      'type' => 'facture',   'res' => $residence1->id, 'by' => $gestionnaire1->id, 'ko' => 78,   'date' => '2026-04-05'],
            ['nom' => 'Assurance multirisque Wiqaya 2026',      'type' => 'autre',     'res' => $residence1->id, 'by' => $manager->id,       'ko' => 410,  'date' => '2026-01-10'],
            ['nom' => 'Loi 18-00 copropriété',                  'type' => 'autre',     'res' => null,            'by' => $manager->id,       'ko' => 890,  'date' => '2024-01-01'],
            ['nom' => 'Décret d\'application loi 18-00',        'type' => 'autre',     'res' => null,            'by' => $manager->id,       'ko' => 650,  'date' => '2024-01-01'],
            ['nom' => 'Règlement de copropriété — Anfa Gardens','type' => 'reglement', 'res' => $residence2->id, 'by' => $gestionnaire2->id, 'ko' => 980,  'date' => '2022-06-10'],
            ['nom' => 'Contrat gardiennage Anfa 2026',          'type' => 'contrat',   'res' => $residence2->id, 'by' => $gestionnaire2->id, 'ko' => 290,  'date' => '2026-01-08'],
        ];

        foreach ($docs as $doc) {
            Document::create([
                'tenant_id'    => $t,
                'residence_id' => $doc['res'],
                'uploaded_by'  => $doc['by'],
                'nom'          => $doc['nom'],
                'type'         => $doc['type'],
                'file_path'    => 'documents/'.strtolower(str_replace([' ', '—', '\''], ['-', '', ''], $doc['nom'])).'.pdf',
                'mime_type'    => 'application/pdf',
                'taille_ko'    => $doc['ko'],
                'date'         => $doc['date'],
            ]);
        }

        // ══════════════════════════════════════════════════════════
        // 15. NOTIFICATIONS — In-app pour les gestionnaires
        // ══════════════════════════════════════════════════════════
        $notifs = [
            ['user' => $gestionnaire1->id, 'type' => 'paiement',   'title' => 'Paiement reçu',              'message' => 'Hassan Benali a réglé 975 MAD — Lot A101 (Q2 2026)',             'read' => false, 'ago' => 1],
            ['user' => $gestionnaire1->id, 'type' => 'paiement',   'title' => 'Paiement reçu',              'message' => 'Fatima Chraibi a réglé 825 MAD par virement — Lot A102',         'read' => false, 'ago' => 2],
            ['user' => $gestionnaire1->id, 'type' => 'ticket',     'title' => 'Nouvelle réclamation',        'message' => 'Hassan Benali : "L\'ascenseur est bloqué au 3ème étage"',        'read' => false, 'ago' => 3],
            ['user' => $gestionnaire1->id, 'type' => 'retard',     'title' => 'Impayé détecté',              'message' => 'Tariq Lamrani — Lot A117 : 675 MAD en retard de 15 jours',       'read' => false, 'ago' => 5],
            ['user' => $gestionnaire1->id, 'type' => 'retard',     'title' => 'Impayé détecté',              'message' => 'Hafida Ghazi — Lot A118 : 675 MAD en retard de 15 jours',        'read' => true,  'ago' => 5],
            ['user' => $gestionnaire1->id, 'type' => 'ticket',     'title' => 'Réclamation mise à jour',     'message' => 'Ticket #2 (plomberie) passé en statut "en cours"',                'read' => true,  'ago' => 7],
            ['user' => $gestionnaire1->id, 'type' => 'assemblee',  'title' => 'AG planifiée',                'message' => 'AG Ordinaire 2026 prévue le 14 juin — Résidence Atlas',           'read' => true,  'ago' => 14],
            ['user' => $gestionnaire1->id, 'type' => 'info',       'title' => 'Bienvenue sur imaro',         'message' => 'Votre espace gestionnaire est prêt. Consultez le dashboard.',      'read' => true,  'ago' => 30],
            ['user' => $gestionnaire1->id, 'type' => 'paiement',   'title' => 'Paiement partiel',            'message' => 'Meriem Ouazzani a réglé 300 MAD sur 750 MAD — Lot B1',            'read' => false, 'ago' => 4],
            ['user' => $gestionnaire1->id, 'type' => 'ticket',     'title' => 'Réclamation urgente',         'message' => 'Zineb Tahiri : "Éclairage du parking sous-sol en panne"',          'read' => false, 'ago' => 5],
            ['user' => $gestionnaire2->id, 'type' => 'ticket',     'title' => 'Nouvelle réclamation',        'message' => 'Hamza El Idrissi : "Piscine non nettoyée depuis 2 semaines"',     'read' => false, 'ago' => 1],
            ['user' => $gestionnaire2->id, 'type' => 'paiement',   'title' => 'Paiement reçu',              'message' => 'Amine Benjelloun a réglé 3 000 MAD — Lot C201 (S1 Anfa)',         'read' => false, 'ago' => 3],
            ['user' => $gestionnaire2->id, 'type' => 'retard',     'title' => 'Impayé détecté',              'message' => 'Imane Kabbaj — Lot C208 : 2 250 MAD en retard de 20 jours',       'read' => true,  'ago' => 8],
            ['user' => $gestionnaire2->id, 'type' => 'assemblee',  'title' => 'AG planifiée',                'message' => 'AG Ordinaire Anfa 2026 prévue le 28 juin',                         'read' => true,  'ago' => 10],
        ];

        foreach ($notifs as $n) {
            Notification::create([
                'tenant_id'  => $t,
                'user_id'    => $n['user'],
                'type'       => $n['type'],
                'title'      => $n['title'],
                'message'    => $n['message'],
                'read'       => $n['read'],
                'created_at' => now()->subDays($n['ago']),
                'updated_at' => now()->subDays($n['ago']),
            ]);
        }

        // ══════════════════════════════════════════════════════════
        // RÉSUMÉ
        // ══════════════════════════════════════════════════════════
        $this->command->info('');
        $this->command->info('  DemoSeeder termine !');
        $this->command->info('');
        $this->command->info('  Tenant       : Blanca Syndic (subdomain: blanca)');
        $this->command->info('  Manager      : fikri@blancasyndic.ma / imaro2026');
        $this->command->info('  Gestionnaire1: alaoui@blancasyndic.ma / imaro2026  (Res. Atlas)');
        $this->command->info('  Gestionnaire2: mansouri@blancasyndic.ma / imaro2026 (Anfa Gardens)');
        $this->command->info('  Conseil      : elfassi@email.ma / imaro2026');
        $this->command->info('  Residents    : 30 (mot de passe: resident2026)');
        $this->command->info('');
        $this->command->info('  Residence Atlas      : 20 lots, 1000 tantiemes, Bd Zerktouni Casa');
        $this->command->info('  Residence Anfa Gardens: 10 lots, 1000 tantiemes, Rue des Palmiers Casa');
        $this->command->info('');
        $this->command->info('  Exercices    : 2025 (cloture) + 2026 (actif) pour Atlas | 2026 (actif) pour Anfa');
        $this->command->info('  Prestataires : 7 (ascenseur, nettoyage, plomberie, gardiennage, jardin, electricite, assurance)');
        $this->command->info('  Contrats     : 7 (5 actifs, 1 expire, 1 Anfa)');
        $this->command->info('  Budget Atlas : 212 000 DH prevu, 82 800 DH realise (10 postes, approuve)');
        $this->command->info('  Budget Anfa  : 108 000 DH prevu (5 postes, brouillon)');
        $this->command->info('  Appels fonds : Q1 Atlas (solde) + Q2 Atlas (15 payes, 2 partiels, 3 impayes) + S1 Anfa (7/10 payes)');
        $this->command->info('  Depenses     : 21 (gardiennage, nettoyage, LYDEC, ascenseur, assurance, admin, reparations)');
        $this->command->info('  Tickets      : 7 (3 urgents, 2 en cours, 1 resolu, 1 Anfa)');
        $this->command->info('  Annonces     : 6 (4 publiees, 1 brouillon, 1 Anfa)');
        $this->command->info('  Assemblees   : 4 (2 planifiees Atlas, 1 tenue Atlas, 1 planifiee Anfa)');
        $this->command->info('  Documents    : 12 (PV, reglements, contrats, factures, assurance, loi 18-00)');
        $this->command->info('  Notifications: 14 (paiements, tickets, impayes, AG, info)');
        $this->command->info('');
    }
}
