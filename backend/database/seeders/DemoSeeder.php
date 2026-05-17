<?php

namespace Database\Seeders;

use App\Models\Annonce;
use App\Models\AppelFonds;
use App\Models\Assemblee;
use App\Models\Budget;
use App\Models\Contrat;
use App\Models\Coproprietaire;
use App\Models\Document;
use App\Models\Exercice;
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

class DemoSeeder extends Seeder
{
    public function run(): void
    {
        // ── 1. Tenant ──────────────────────────────────────────
        $tenant = Tenant::create([
            'name' => 'Blanca Syndic',
            'email' => 'contact@blancasyndic.ma',
            'phone' => '+212522000001',
            'plan' => 'business',
            'max_logins' => 500,
            'rc' => 'RC-122735',
            'subdomain' => 'blanca',
            'status' => 'active',
        ]);

        $t = $tenant->id;
        config(['app.tenant_id' => $t]);

        // ── 2. Users ───────────────────────────────────────────
        $manager = User::create([
            'tenant_id' => $t,
            'name' => 'Mohammed Fikri',
            'phone' => '+212600000001',
            'email' => 'fikri@blancasyndic.ma',
            'role' => 'manager',
            'status' => 'active',
        ]);
        $manager->assignRole('manager');

        $gestionnaire1 = User::create([
            'tenant_id' => $t,
            'name' => 'Karim Alaoui',
            'phone' => '+212600000002',
            'email' => 'alaoui@blancasyndic.ma',
            'role' => 'gestionnaire',
            'status' => 'active',
        ]);
        $gestionnaire1->assignRole('gestionnaire');

        $gestionnaire2 = User::create([
            'tenant_id' => $t,
            'name' => 'Leila Mansouri',
            'phone' => '+212600000003',
            'email' => 'mansouri@blancasyndic.ma',
            'role' => 'gestionnaire',
            'status' => 'active',
        ]);
        $gestionnaire2->assignRole('gestionnaire');

        $conseil = User::create([
            'tenant_id' => $t,
            'name' => 'Driss El Fassi',
            'phone' => '+212600000004',
            'email' => 'elfassi@email.ma',
            'role' => 'conseil',
            'status' => 'active',
        ]);
        $conseil->assignRole('conseil');

        // ── 3. Résidence ───────────────────────────────────────
        $residence = Residence::withoutGlobalScope('tenant')->create([
            'tenant_id' => $t,
            'gestionnaire_id' => $gestionnaire1->id,
            'name' => 'Résidence Atlas',
            'address' => '12 Boulevard Zerktouni',
            'city' => 'Casablanca',
            'total_tantieme' => 1000,
            'nb_lots' => 20,
            'status' => 'active',
        ]);

        // ── 4. Exercice actif 2026 ─────────────────────────────
        $exercice = Exercice::withoutGlobalScope('tenant')->create([
            'tenant_id' => $t,
            'residence_id' => $residence->id,
            'annee' => 2026,
            'date_debut' => '2026-01-01',
            'date_fin' => '2026-12-31',
            'statut' => 'actif',
        ]);

        // ── 5. Lots + Copropriétaires (20 noms marocains) ──────
        $nomsMarocains = [
            'Hassan Benali', 'Fatima Chraibi', 'Youssef Tazi',
            'Nadia Berrada', 'Omar Fassi', 'Amina Kettani',
            'Rachid Squalli', 'Houda Lahlou', 'Mehdi Bensouda',
            'Souad El Amrani', 'Khalid Bennani', 'Zineb Tahiri',
            'Samir Cherkaoui', 'Khadija Benhaddou', 'Adil Ziani',
            'Meriem Ouazzani', 'Tariq Lamrani', 'Hafida Ghazi',
            'Younes Sabri', 'Rajaa Filali',
        ];

        $tantiemes = [
            65, 55, 50, 50, 50, 50, 50, 50, 50, 50,
            50, 50, 50, 50, 50, 50, 45, 45, 45, 45,
        ];

        $types = ['appartement', 'appartement', 'appartement', 'local_commercial', 'appartement'];
        $coproprietaires = [];

        foreach ($nomsMarocains as $i => $nom) {
            $lot = Lot::create([
                'tenant_id' => $t,
                'residence_id' => $residence->id,
                'numero' => 'Apt ' . ($i + 1),
                'etage' => (int) floor($i / 4) + 1,
                'type' => $types[$i % count($types)],
                'superficie' => rand(55, 130),
                'tantieme' => $tantiemes[$i],
            ]);

            $user = User::create([
                'tenant_id' => $t,
                'name' => $nom,
                'phone' => '+2126' . str_pad($i + 10, 8, '0', STR_PAD_LEFT),
                'email' => strtolower(str_replace(' ', '.', $nom)) . '@email.ma',
                'role' => 'resident',
                'status' => 'active',
            ]);
            $user->assignRole('resident');

            $copro = Coproprietaire::create([
                'tenant_id' => $t,
                'user_id' => $user->id,
                'lot_id' => $lot->id,
                'type' => 'proprietaire',
                'date_entree' => now()->subMonths(rand(6, 36)),
                'solde_actuel' => 0,
            ]);

            $coproprietaires[] = ['copro' => $copro, 'lot' => $lot, 'user' => $user];
        }

        // ── 6. Prestataires (fournisseurs marocains) ────────────
        $prestataires = [];

        $prestataires[] = Prestataire::create([
            'tenant_id' => $t,
            'nom' => 'Atlas Ascenseurs SARL',
            'telephone' => '+212522334455',
            'email' => 'contact@atlasascenseurs.ma',
            'specialite' => 'ascenseur',
            'note_moyenne' => 4.2,
            'nb_interventions' => 12,
            'statut' => 'actif',
        ]);

        $prestataires[] = Prestataire::create([
            'tenant_id' => $t,
            'nom' => 'ProClean Services',
            'telephone' => '+212661778899',
            'email' => 'info@proclean.ma',
            'specialite' => 'nettoyage',
            'note_moyenne' => 3.8,
            'nb_interventions' => 24,
            'statut' => 'actif',
        ]);

        $prestataires[] = Prestataire::create([
            'tenant_id' => $t,
            'nom' => 'Bab Plomberie',
            'telephone' => '+212600556677',
            'email' => 'bab.plomberie@gmail.com',
            'specialite' => 'plomberie',
            'note_moyenne' => 4.5,
            'nb_interventions' => 8,
            'statut' => 'actif',
        ]);

        $prestataires[] = Prestataire::create([
            'tenant_id' => $t,
            'nom' => 'Garde Sécurité Maroc',
            'telephone' => '+212522889900',
            'email' => 'rh@gardesecurite.ma',
            'specialite' => 'gardiennage',
            'note_moyenne' => 4.0,
            'nb_interventions' => 36,
            'statut' => 'actif',
        ]);

        $prestataires[] = Prestataire::create([
            'tenant_id' => $t,
            'nom' => 'Jardins du Sud',
            'telephone' => '+212661223344',
            'email' => 'contact@jardinsdusud.ma',
            'specialite' => 'espaces_verts',
            'note_moyenne' => 3.5,
            'nb_interventions' => 6,
            'statut' => 'inactif',
        ]);

        // ── 7. Contrats ────────────────────────────────────────
        Contrat::create([
            'tenant_id' => $t,
            'residence_id' => $residence->id,
            'prestataire_id' => $prestataires[3]->id,
            'titre' => 'Gardiennage Résidence Atlas',
            'type' => 'gardiennage',
            'montant' => 60000,
            'date_debut' => '2026-01-01',
            'date_fin' => '2026-12-31',
            'statut' => 'actif',
            'renouvellement_auto' => true,
        ]);

        Contrat::create([
            'tenant_id' => $t,
            'residence_id' => $residence->id,
            'prestataire_id' => $prestataires[1]->id,
            'titre' => 'Nettoyage parties communes',
            'type' => 'nettoyage',
            'montant' => 36000,
            'date_debut' => '2026-01-01',
            'date_fin' => '2026-12-31',
            'statut' => 'actif',
            'renouvellement_auto' => true,
        ]);

        Contrat::create([
            'tenant_id' => $t,
            'residence_id' => $residence->id,
            'prestataire_id' => $prestataires[0]->id,
            'titre' => 'Maintenance ascenseur',
            'type' => 'maintenance',
            'montant' => 24000,
            'date_debut' => '2026-03-01',
            'date_fin' => '2027-02-28',
            'statut' => 'actif',
            'renouvellement_auto' => false,
        ]);

        Contrat::create([
            'tenant_id' => $t,
            'residence_id' => $residence->id,
            'prestataire_id' => $prestataires[4]->id,
            'titre' => 'Entretien jardin',
            'type' => 'autre',
            'montant' => 18000,
            'date_debut' => '2025-06-01',
            'date_fin' => '2026-05-31',
            'statut' => 'expire',
            'renouvellement_auto' => false,
        ]);

        // ── 8. Budget + Postes budgétaires ──────────────────────
        $budget = Budget::create([
            'tenant_id' => $t,
            'residence_id' => $residence->id,
            'exercice_id' => $exercice->id,
            'statut' => 'approuve',
            'approuve_at' => '2026-01-15',
        ]);

        $postes = [
            ['categorie' => 'gardiennage', 'description' => 'Salaire gardien + charges', 'montant_prevu' => 60000, 'montant_realise' => 25000],
            ['categorie' => 'nettoyage', 'description' => 'Nettoyage parties communes', 'montant_prevu' => 36000, 'montant_realise' => 15000],
            ['categorie' => 'entretien', 'description' => 'Contrat maintenance ascenseur + réparations', 'montant_prevu' => 30000, 'montant_realise' => 12000],
            ['categorie' => 'entretien', 'description' => 'Éclairage parties communes', 'montant_prevu' => 18000, 'montant_realise' => 7500],
            ['categorie' => 'entretien', 'description' => 'Consommation eau commune', 'montant_prevu' => 12000, 'montant_realise' => 5200],
            ['categorie' => 'autre', 'description' => 'Entretien jardin et espaces verts', 'montant_prevu' => 18000, 'montant_realise' => 0],
            ['categorie' => 'assurance', 'description' => 'Assurance multirisque immeuble', 'montant_prevu' => 8000, 'montant_realise' => 8000],
            ['categorie' => 'administratif', 'description' => 'Frais administratifs et imprévus', 'montant_prevu' => 10000, 'montant_realise' => 3200],
        ];

        foreach ($postes as $poste) {
            PosteBudgetaire::create(array_merge($poste, ['budget_id' => $budget->id]));
        }

        // ── 9. Appel de fonds ──────────────────────────────────
        $appelFonds = AppelFonds::withoutGlobalScope('tenant')->create([
            'tenant_id' => $t,
            'residence_id' => $residence->id,
            'exercice_id' => $exercice->id,
            'created_by' => $gestionnaire1->id,
            'libelle' => 'Charges Q2 2026',
            'description' => 'Charges communes : gardiennage, ascenseur, nettoyage, électricité',
            'montant_total' => 18000,
            'date_echeance' => Carbon::parse('2026-06-30'),
            'statut' => 'envoye',
            'sent_at' => now()->subDays(20),
        ]);

        $appelFonds->genererLignes();

        // ── 10. Paiements (15 payés, 5 impayés dont 3 en retard) ──
        $lignes = $appelFonds->lignes()->with('coproprietaire')->get();
        $modes = ['virement', 'cheque', 'especes', 'virement', 'virement'];

        foreach ($lignes->take(15) as $i => $ligne) {
            Paiement::create([
                'tenant_id' => $t,
                'exercice_id' => $exercice->id,
                'coproprietaire_id' => $ligne->coproprietaire_id,
                'appel_fonds_ligne_id' => $ligne->id,
                'saisi_par' => $gestionnaire1->id,
                'montant' => $ligne->montant_du,
                'mode' => $modes[$i % count($modes)],
                'reference' => 'PAY-2026-' . str_pad($i + 1, 4, '0', STR_PAD_LEFT),
                'date_paiement' => now()->subDays(rand(5, 30)),
            ]);

            $ligne->update([
                'montant_paye' => $ligne->montant_du,
                'statut' => 'paye',
                'date_paiement' => now()->subDays(rand(5, 30)),
            ]);

            $ligne->coproprietaire->recalculerSolde();
        }

        foreach ($lignes->skip(15) as $ligne) {
            $ligne->coproprietaire->recalculerSolde();
        }

        $appelFonds->update(['statut' => 'partiel']);

        // ── 11. Tickets + Messages ──────────────────────────────
        $ticket1 = Ticket::create([
            'tenant_id' => $t,
            'residence_id' => $residence->id,
            'user_id' => $coproprietaires[0]['user']->id,
            'categorie' => 'ascenseur',
            'description' => "L'ascenseur est en panne depuis ce matin au 3ème étage. Les résidents âgés ne peuvent pas monter. C'est très urgent.",
            'priorite' => 'urgent',
            'statut' => 'ouvert',
        ]);

        $ticket2 = Ticket::create([
            'tenant_id' => $t,
            'residence_id' => $residence->id,
            'user_id' => $coproprietaires[3]['user']->id,
            'categorie' => 'plomberie',
            'description' => "Fuite d'eau au niveau du 2ème étage couloir. L'eau coule depuis hier soir, ça commence à abîmer la peinture.",
            'priorite' => 'normal',
            'statut' => 'en_cours',
        ]);

        $ticket3 = Ticket::create([
            'tenant_id' => $t,
            'residence_id' => $residence->id,
            'user_id' => $coproprietaires[7]['user']->id,
            'categorie' => 'proprete',
            'description' => "Les poubelles du rez-de-chaussée débordent depuis 2 jours. Merci de contacter la société de nettoyage.",
            'priorite' => 'faible',
            'statut' => 'ouvert',
        ]);

        // ── 12. Annonces ────────────────────────────────────────
        Annonce::create([
            'tenant_id' => $t,
            'residence_id' => $residence->id,
            'created_by' => $gestionnaire1->id,
            'titre' => 'Coupure d\'eau prévue le 20 mai',
            'contenu' => "Chers copropriétaires,\n\nLa LYDEC effectuera des travaux de maintenance sur le réseau d'eau le mardi 20 mai de 8h à 14h.\n\nMerci de prévoir vos réserves d'eau.\n\nCordialement,\nLa Gestion",
            'priorite' => 'urgente',
            'statut' => 'publiee',
            'publiee_at' => now()->subDays(2),
        ]);

        Annonce::create([
            'tenant_id' => $t,
            'residence_id' => $residence->id,
            'created_by' => $gestionnaire1->id,
            'titre' => 'Assemblée Générale Ordinaire - Convocation',
            'contenu' => "L'Assemblée Générale Ordinaire de la copropriété Résidence Atlas se tiendra le samedi 14 juin 2026 à 15h00 dans la salle de réunion au RDC.\n\nOrdre du jour :\n1. Approbation des comptes 2025\n2. Budget prévisionnel 2026\n3. Travaux de ravalement\n4. Questions diverses\n\nVotre présence est indispensable.",
            'priorite' => 'urgente',
            'statut' => 'publiee',
            'publiee_at' => now()->subDays(7),
        ]);

        Annonce::create([
            'tenant_id' => $t,
            'residence_id' => $residence->id,
            'created_by' => $gestionnaire2->id,
            'titre' => 'Nouveau règlement parking sous-sol',
            'contenu' => "Suite aux incidents répétés au parking sous-sol, nous rappelons les règles suivantes :\n\n- Chaque lot dispose d'une seule place numérotée\n- Vitesse limitée à 10 km/h\n- Interdiction de stocker des objets hors de votre place\n- Le parking ferme à 23h00\n\nTout manquement sera signalé au syndic.",
            'priorite' => 'normale',
            'statut' => 'publiee',
            'publiee_at' => now()->subDays(14),
        ]);

        Annonce::create([
            'tenant_id' => $t,
            'residence_id' => null,
            'created_by' => $manager->id,
            'titre' => 'Bienvenue sur imaro',
            'contenu' => "Chers résidents,\n\nBienvenue sur la plateforme imaro ! Vous pouvez désormais consulter vos charges, payer en ligne, et soumettre vos réclamations directement depuis l'application.\n\nL'équipe Blanca Syndic",
            'priorite' => 'normale',
            'statut' => 'publiee',
            'publiee_at' => now()->subDays(30),
        ]);

        // ── 13. Assemblées ──────────────────────────────────────
        Assemblee::create([
            'tenant_id' => $t,
            'residence_id' => $residence->id,
            'created_by' => $gestionnaire1->id,
            'titre' => 'AG Ordinaire 2026',
            'type' => 'ordinaire',
            'date' => '2026-06-14 15:00:00',
            'lieu' => 'Salle de réunion RDC, Résidence Atlas',
            'quorum_requis' => 50,
            'ordre_du_jour' => "Approbation des comptes 2025\nBudget prévisionnel 2026\nTravaux de ravalement façade\nRemplacement pompe eau\nQuestions diverses",
            'statut' => 'planifiee',
        ]);

        Assemblee::create([
            'tenant_id' => $t,
            'residence_id' => $residence->id,
            'created_by' => $gestionnaire1->id,
            'titre' => 'AG Extraordinaire - Travaux toiture',
            'type' => 'extraordinaire',
            'date' => '2026-07-20 10:00:00',
            'lieu' => 'Salle de réunion RDC, Résidence Atlas',
            'quorum_requis' => 66,
            'ordre_du_jour' => "Devis travaux toiture terrasse\nVote sur le prestataire\nModalités de financement",
            'statut' => 'planifiee',
        ]);

        Assemblee::create([
            'tenant_id' => $t,
            'residence_id' => $residence->id,
            'created_by' => $gestionnaire1->id,
            'titre' => 'AG Ordinaire 2025',
            'type' => 'ordinaire',
            'date' => '2025-06-20 15:00:00',
            'lieu' => 'Salle de réunion RDC, Résidence Atlas',
            'quorum_requis' => 50,
            'ordre_du_jour' => "Approbation des comptes 2024\nBudget prévisionnel 2025\nÉlection nouveau syndic\nQuestions diverses",
            'statut' => 'tenue',
            'quorum_atteint' => true,
        ]);

        // ── 14. Documents ───────────────────────────────────────
        Document::create([
            'tenant_id' => $t,
            'residence_id' => $residence->id,
            'uploaded_by' => $gestionnaire1->id,
            'nom' => 'PV AG Ordinaire 2025',
            'type' => 'pv_ag',
            'file_path' => 'documents/pv-ag-2025.pdf',
            'mime_type' => 'application/pdf',
            'taille_ko' => 245,
            'date' => '2025-06-25',
        ]);

        Document::create([
            'tenant_id' => $t,
            'residence_id' => $residence->id,
            'uploaded_by' => $gestionnaire1->id,
            'nom' => 'Règlement intérieur',
            'type' => 'reglement',
            'file_path' => 'documents/reglement-interieur.pdf',
            'mime_type' => 'application/pdf',
            'taille_ko' => 180,
            'date' => '2024-01-15',
        ]);

        Document::create([
            'tenant_id' => $t,
            'residence_id' => $residence->id,
            'uploaded_by' => $gestionnaire1->id,
            'nom' => 'Contrat gardiennage 2026',
            'type' => 'contrat',
            'file_path' => 'documents/contrat-gardiennage-2026.pdf',
            'mime_type' => 'application/pdf',
            'taille_ko' => 320,
            'date' => '2026-01-05',
        ]);

        Document::create([
            'tenant_id' => $t,
            'residence_id' => $residence->id,
            'uploaded_by' => $manager->id,
            'nom' => 'Assurance multirisque 2026',
            'type' => 'autre',
            'file_path' => 'documents/assurance-2026.pdf',
            'mime_type' => 'application/pdf',
            'taille_ko' => 410,
            'date' => '2026-01-10',
        ]);

        Document::create([
            'tenant_id' => $t,
            'residence_id' => null,
            'uploaded_by' => $manager->id,
            'nom' => 'Loi 18-00 copropriété',
            'type' => 'autre',
            'file_path' => 'documents/loi-18-00.pdf',
            'mime_type' => 'application/pdf',
            'taille_ko' => 890,
            'date' => '2024-01-01',
        ]);

        // ── Résumé ──────────────────────────────────────────────
        $this->command->info('');
        $this->command->info('✅ DemoSeeder terminé !');
        $this->command->info('');
        $this->command->info('   📋 Tenant       : Blanca Syndic (subdomain: blanca)');
        $this->command->info('   👤 Manager      : Mohammed Fikri (+212600000001)');
        $this->command->info('   👥 Gestionnaires: Karim Alaoui (+212600000002), Leila Mansouri (+212600000003)');
        $this->command->info('   🏛️  Conseil      : Driss El Fassi (+212600000004)');
        $this->command->info('   🏠 Résidence    : Résidence Atlas · 20 lots · 1 000 tantièmes');
        $this->command->info('   📅 Exercice     : 2026 (actif)');
        $this->command->info('   🔧 Prestataires : 5 (ascenseur, nettoyage, plomberie, gardiennage, jardin)');
        $this->command->info('   📄 Contrats     : 4 (3 actifs, 1 expiré)');
        $this->command->info('   💰 Budget       : 192 000 DH prévu · 75 900 DH réalisé (8 postes)');
        $this->command->info('   📨 Appel fonds  : Charges Q2 2026 · 18 000 DH · 15/20 payés');
        $this->command->info('   🎫 Tickets      : 3 (1 urgent, 1 en cours, 1 faible)');
        $this->command->info('   📢 Annonces     : 4 (coupure eau, AG, parking, bienvenue)');
        $this->command->info('   🏛️  Assemblées   : 3 (2 planifiées, 1 terminée)');
        $this->command->info('   📁 Documents    : 5 (PV, règlement, contrat, assurance, loi)');
        $this->command->info('');
        $this->command->info('   🔑 Login: +212600000001 (OTP dans les logs)');
    }
}
