<?php

namespace Database\Seeders;

use App\Models\Annonce;
use App\Models\AppelFonds;
use App\Models\Assemblee;
use App\Models\AuditLog;
use App\Models\AutreRecette;
use App\Models\Budget;
use App\Models\Contrat;
use App\Models\Coproprietaire;
use App\Models\Depense;
use App\Models\Document;
use App\Models\Emprunt;
use App\Models\Equipement;
use App\Models\Exercice;
use App\Models\Immeuble;
use App\Models\Lot;
use App\Models\Notification;
use App\Models\Occupant;
use App\Models\Paiement;
use App\Models\PenaltyConfig;
use App\Models\PosteBudgetaire;
use App\Models\Prestataire;
use App\Models\Remboursement;
use App\Models\Residence;
use App\Models\Tenant;
use App\Models\Ticket;
use App\Models\TravauxExceptionnel;
use App\Models\User;
use App\Services\ComplianceCalendarService;
use Barryvdh\DomPDF\Facade\Pdf;
use Carbon\Carbon;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Storage;

/**
 * Démo COMPLET « TestSyndic » — Résidence Aqualina, basé sur un vrai devis.
 *
 * Simule l'activité de NOVEMBRE 2025 → aujourd'hui sur TOUTES les sections :
 * exercices, lots/copros, prestataires/contrats, budget, appels de fonds (Q4-25
 * → Q2-26), paiements/impayés, dépenses mensuelles, recettes annexes, tickets,
 * annonces, assemblées, documents (vrais PDF générés), équipements, emprunts,
 * travaux exceptionnels, remboursements, occupants, pénalités, calendrier de
 * conformité, notifications, journal d'audit.
 *
 *   php artisan db:seed --class=TestSyndicSeeder
 */
class TestSyndicSeeder extends Seeder
{
    private int $t;

    public function run(): void
    {
        if (Tenant::where('subdomain', 'testsyndic')->exists()) {
            $this->command->warn('Tenant « testsyndic » déjà présent — seed ignoré (purge d\'abord).');

            return;
        }

        // ── 1. TENANT + STAFF ───────────────────────────────────────
        $tenant = Tenant::create([
            'name' => 'TestSyndic', 'email' => 'contact@testsyndic.ma', 'phone' => '+212522700001',
            'plan' => 'business', 'max_logins' => 500, 'rc' => 'RC-300055',
            'subdomain' => 'testsyndic', 'status' => 'active',
        ]);
        $this->t = $t = $tenant->id;
        config(['app.tenant_id' => $t]);

        $manager = $this->user('Othmane Bennani', '+212700000001', 'manager@testsyndic.ma', 'manager');
        $gest = $this->user('Sanae Idrissi', '+212700000002', 'gestionnaire@testsyndic.ma', 'gestionnaire', ['paiement' => true, 'ticket' => true, 'assemblee' => true, 'retard' => true]);
        $this->user('Abdelhak Naciri', '+212700000003', 'conseil@testsyndic.ma', 'conseil');

        // ── 2. RÉSIDENCE + IMMEUBLES + EXERCICES ────────────────────
        $res = Residence::withoutGlobalScope('tenant')->create([
            'tenant_id' => $t, 'gestionnaire_id' => $gest->id, 'name' => 'Résidence Aqualina',
            'address' => 'Boulevard de l\'Océan, Aïn Diab', 'city' => 'Casablanca',
            'total_tantieme' => 1000, 'mode_cotisation' => 'tantieme', 'cotisation_mensuelle' => null,
            'nb_lots' => 75, 'status' => 'active',
        ]);

        $immeubles = [];
        foreach (['Bloc A', 'Bloc B', 'Bloc C', 'Galerie Commerciale'] as $nom) {
            $immeubles[] = Immeuble::withoutGlobalScope('tenant')->create([
                'tenant_id' => $t, 'residence_id' => $res->id, 'groupe_habitation_id' => null,
                'nom' => $nom, 'nb_etages' => $nom === 'Galerie Commerciale' ? 1 : 6, 'nb_lots' => 0,
            ]);
        }

        $ex2025 = Exercice::withoutGlobalScope('tenant')->create([
            'tenant_id' => $t, 'residence_id' => $res->id, 'annee' => 2025,
            'date_debut' => '2025-01-01', 'date_fin' => '2025-12-31', 'statut' => 'cloture',
        ]);
        $ex = Exercice::withoutGlobalScope('tenant')->create([
            'tenant_id' => $t, 'residence_id' => $res->id, 'annee' => 2026,
            'date_debut' => '2026-01-01', 'date_fin' => '2026-12-31', 'statut' => 'actif',
        ]);

        // ── 3. LOTS (75) + COPROS (68, 7 libres) — tantième = 1000 ──
        $apptTantiemes = array_merge(array_fill(0, 34, 15), array_fill(0, 29, 14));
        $prenoms = ['Hamza', 'Salma', 'Yassine', 'Nawal', 'Anas', 'Imane', 'Bilal', 'Hind', 'Marouane', 'Sara',
            'Ayoub', 'Kawtar', 'Zakaria', 'Meryem', 'Ilyas', 'Asma', 'Soufiane', 'Loubna', 'Achraf', 'Dounia',
            'Nabil', 'Fadwa', 'Walid', 'Siham', 'Othmane', 'Rim', 'Hicham', 'Ghizlane', 'Karim', 'Btissam'];
        $noms = ['El Khattabi', 'Berrada', 'Sebti', 'Lahlou', 'Bennis', 'Chraibi', 'Tazi', 'Alaoui', 'Bargach',
            'Skalli', 'Lamrani', 'Benkirane', 'Fihri', 'Guessous', 'Cherkaoui', 'Belghiti', 'Sefrioui', 'Kadiri'];
        $vacants = [12, 33, 58, 70, 71, 73, 74];

        $copros = [];
        $resCount = 0;
        for ($i = 0; $i < 75; $i++) {
            $isMag = $i >= 63;
            $li = $isMag ? $i - 63 : $i;
            if ($isMag) {
                $imm = $immeubles[3];
                $numero = 'M'.($li + 1);
                $etage = 0;
                $tant = 7;
                $type = 'local_commercial';
            } else {
                $b = intdiv($li, 21);
                $imm = $immeubles[$b];
                $numero = ['A', 'B', 'C'][$b].(($li % 21) + 1);
                $etage = intdiv($li % 21, 4) + 1;
                $tant = $apptTantiemes[$li];
                $type = 'appartement';
            }

            $lot = Lot::withoutGlobalScope('tenant')->create([
                'tenant_id' => $t, 'residence_id' => $res->id, 'immeuble_id' => $imm->id,
                'numero' => $numero, 'etage' => $etage, 'type' => $type,
                'superficie' => $isMag ? rand(25, 80) : rand(60, 140), 'tantieme' => $tant,
            ]);

            if (in_array($i, $vacants, true)) {
                continue;
            }

            $name = $prenoms[$resCount % count($prenoms)].' '.$noms[($resCount * 5 + 3) % count($noms)];
            $u = User::create([
                'tenant_id' => $t, 'name' => $name,
                'phone' => '+21277'.str_pad((string) ($resCount + 1), 7, '0', STR_PAD_LEFT),
                'email' => 'copro'.($resCount + 1).'@aqualina-demo.ma',
                'role' => 'resident', 'status' => 'active', 'password' => bcrypt('resident2026'),
            ]);
            $u->assignRole('resident');

            $copros[] = [
                'copro' => Coproprietaire::create([
                    'tenant_id' => $t, 'user_id' => $u->id, 'lot_id' => $lot->id,
                    'type' => $isMag ? 'locataire' : 'proprietaire', 'date_entree' => '2025-01-01', 'solde_actuel' => 0,
                ]),
                'lot' => $lot, 'user' => $u, 'nom' => $name,
            ];
            $resCount++;
        }

        // ── 4. PRESTATAIRES + CONTRATS (démarrés 01/01/2026) ────────
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
                'email' => 'contact'.($j + 1).'@'.str_replace(' ', '', strtolower($d[0])).'.ma',
                'specialite' => $d[2], 'note_moyenne' => round(rand(35, 49) / 10, 1),
                'nb_interventions' => rand(2, 20), 'statut' => 'actif',
            ]);
        }
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
                'tenant_id' => $t, 'residence_id' => $res->id, 'prestataire_id' => $presta[$c[0]]->id,
                'titre' => $c[1], 'type' => $c[2], 'montant' => $c[3],
                'date_debut' => '2026-01-01', 'date_fin' => '2026-12-31', 'statut' => 'actif', 'renouvellement_auto' => true,
            ]);
        }

        // ── 5. BUDGET 2026 (postes = 496 800 DH) ────────────────────
        $budget = Budget::create([
            'tenant_id' => $t, 'residence_id' => $res->id, 'exercice_id' => $ex->id,
            'statut' => 'approuve', 'approuve_at' => '2026-01-15',
        ]);
        $postes = [
            ['gardiennage', 'Sécurité jour + nuit 7/7 (4 agents)', 211200], ['nettoyage', 'Femmes de ménage 6/7 (2)', 96000],
            ['entretien', 'Agent polyvalent balayeur & jardinier 6/7', 54000], ['entretien', 'Maintenance ascenseurs (4 cabines)', 16800],
            ['entretien', 'Entretien piscine', 8400], ['entretien', 'Entretien espaces verts', 6000],
            ['entretien', 'Consommation eau & électricité communes', 14400], ['entretien', 'Produits de nettoyage', 6000],
            ['entretien', 'Traitement 3D (désinsectisation)', 4800], ['assurance', 'Assurance multirisque parties communes', 6000],
            ['administratif', 'Honoraires de syndic', 50400], ['administratif', 'Frais bancaires', 1200],
            ['administratif', 'Honoraires huissier — AG annuelles', 1500], ['administratif', 'Organisation AG annuelle', 1500],
            ['autre', 'Compte de réserves', 18600],
        ];
        foreach ($postes as $p) {
            PosteBudgetaire::create(['budget_id' => $budget->id, 'categorie' => $p[0], 'description' => $p[1],
                'montant_prevu' => $p[2], 'montant_realise' => round($p[2] * 0.45, 2)]);
        }

        // ── 6. APPELS DE FONDS (Q4-2025 → Q2-2026) + PAIEMENTS ──────
        $modes = ['virement', 'cheque', 'especes', 'virement', 'virement'];
        $n = 1;
        // Q4 2025 (exercice clôturé) — soldé
        $this->appelEtPaie($res, $ex2025, $gest, 'Charges trimestrielles Q4 2025', 'Gardiennage, ménage, ascenseurs (oct-déc 2025)',
            124200, '2025-10-05', '2025-12-31', 'solde', $modes, $n, 'all');
        // Q1 2026 — soldé
        $this->appelEtPaie($res, $ex, $gest, 'Charges trimestrielles Q1 2026', 'Gardiennage, ménage, ascenseurs (jan-mars)',
            124200, '2026-01-05', '2026-03-31', 'solde', $modes, $n, 'all');
        // Q2 2026 — partiel (impayés)
        $this->appelEtPaie($res, $ex, $gest, 'Charges trimestrielles Q2 2026', 'Gardiennage, ménage, ascenseurs (avr-juin)',
            124200, '2026-04-01', '2026-06-30', 'envoye', $modes, $n, 'partial');

        // ── 7. DÉPENSES mensuelles (nov 2025 → juin 2026) ───────────
        $charges = [
            ['Salaires sécurité 7/7 (jour+nuit)', 'gardiennage', 17600, 0],
            ['Salaires ménage 6/7', 'nettoyage', 8000, 1],
            ['Maintenance ascenseurs', 'entretien', 1400, 2],
            ['Eau & électricité communes (LYDEC)', 'eau_electricite', 1200, null],
            ['Entretien piscine', 'entretien', 700, 3],
            ['Entretien espaces verts', 'espaces_verts', 500, 4],
            ['Honoraires de syndic', 'administratif', 4200, null],
        ];
        $month = Carbon::parse('2025-11-01');
        $end = Carbon::parse('2026-06-01');
        while ($month <= $end) {
            $exDep = $month->year === 2025 ? $ex2025 : $ex;
            foreach ($charges as $c) {
                $date = $month->copy()->day(rand(3, 27));
                Depense::create([
                    'tenant_id' => $t, 'exercice_id' => $exDep->id, 'residence_id' => $res->id,
                    'prestataire_id' => $c[3] !== null ? $presta[$c[3]]->id : null, 'created_by' => $gest->id,
                    'description' => $c[0].' — '.$month->translatedFormat('F Y'), 'categorie' => $c[1],
                    'montant' => $c[2], 'date' => $date->toDateString(),
                    'statut' => $date->isPast() ? 'paye' : 'en_attente',
                ]);
            }
            $month->addMonth();
        }
        // Quelques dépenses ponctuelles
        foreach ([
            ['Prime assurance multirisque 2026', 'assurance', 6000, '2026-01-15', 6, 'paye'],
            ['Traitement 3D désinsectisation', 'entretien', 2400, '2026-02-10', 5, 'paye'],
            ['Réparation pompe piscine', 'entretien', 3500, '2026-04-22', 3, 'paye'],
            ['Frais bancaires T1+T2', 'administratif', 600, '2026-05-31', null, 'en_attente'],
        ] as $d) {
            Depense::create([
                'tenant_id' => $t, 'exercice_id' => $ex->id, 'residence_id' => $res->id,
                'prestataire_id' => $d[4] !== null ? $presta[$d[4]]->id : null, 'created_by' => $gest->id,
                'description' => $d[0], 'categorie' => $d[1], 'montant' => $d[2], 'date' => $d[3], 'statut' => $d[5],
            ]);
        }

        // ── 8. AUTRES RECETTES ──────────────────────────────────────
        foreach ([
            ['2025-12-01', 'Location antenne Inwi — Aqualina', 'location_antenne', 18000, 'Inwi Telecom', 'REC-2025-ANT'],
            ['2026-01-15', 'Location parking visiteurs — Janvier', 'location_parking', 2400, 'Diamant Auto', 'REC-2026-001'],
            ['2026-03-15', 'Location parking visiteurs — Mars', 'location_parking', 2400, 'Diamant Auto', 'REC-2026-003'],
            ['2026-04-30', 'Pénalités de retard — Q1', 'penalite_retard', 3200, null, 'PEN-2026-Q1'],
            ['2026-02-01', 'Indemnité assurance — dégât parking', 'indemnite_assurance', 8500, 'Wiqaya', 'IND-2026-001'],
            ['2026-05-10', 'Location galerie commerciale — Café', 'location_salle', 5000, 'Café Aqualina', 'LOC-2026-001'],
        ] as $r) {
            AutreRecette::create([
                'tenant_id' => $t, 'residence_id' => $res->id, 'exercice' => Carbon::parse($r[0])->year,
                'date' => $r[0], 'libelle' => $r[1], 'categorie' => $r[2], 'montant' => $r[3],
                'payeur' => $r[4], 'reference' => $r[5],
            ]);
        }

        // ── 9. TICKETS (cycle de vie varié) ─────────────────────────
        foreach ([
            ['ascenseur', 'urgent', 'ouvert', 'Ascenseur du Bloc B bloqué entre le 3e et 4e étage depuis hier soir.', 1, null],
            ['plomberie', 'normal', 'en_cours', 'Fuite d\'eau dans le parking sous-sol près de la place 12.', 6, null],
            ['proprete', 'faible', 'resolu', 'Encombrants laissés dans le hall du Bloc A.', 20, 5],
            ['securite', 'urgent', 'ouvert', 'Portail principal ne se verrouille plus la nuit.', 2, null],
            ['electricite', 'normal', 'clos', 'Éclairage du couloir Bloc C en panne (réparé).', 40, 35],
            ['proprete', 'faible', 'en_cours', 'Local poubelles à désinfecter, odeurs.', 3, null],
        ] as $k => $td) {
            $c = $copros[$k * 7 % count($copros)];
            $data = ['tenant_id' => $t, 'residence_id' => $res->id, 'user_id' => $c['user']->id, 'lot_id' => $c['lot']->id,
                'categorie' => $td[0], 'priorite' => $td[1], 'statut' => $td[2], 'description' => $td[3],
                'created_at' => now()->subDays($td[4])];
            if ($td[5] !== null) {
                $data['closed_at'] = now()->subDays($td[5]);
            }
            Ticket::create($data);
        }

        // ── 10. ANNONCES ────────────────────────────────────────────
        foreach ([
            ['Coupure d\'eau LYDEC — maintenance', "La LYDEC effectuera une maintenance du réseau le 18 juin de 8h à 13h. Prévoyez vos réserves.", 'urgente', 'publiee', 3],
            ['Convocation AG Ordinaire — 14 juin 2026', "L'AG Ordinaire de la Résidence Aqualina se tiendra le 14 juin 2026 à 15h.\nOrdre du jour : comptes 2025, budget 2026, travaux ravalement.", 'urgente', 'publiee', 20],
            ['Nouveau règlement parking & galerie', "Rappel : vitesse limitée à 10 km/h au sous-sol, fermeture des grilles à 23h.", 'normale', 'publiee', 35],
            ['Fermeture piscine pour entretien', "La piscine sera fermée du 1er au 5 juillet pour traitement et remise aux normes.", 'normale', 'publiee', 1],
            ['Travaux ravalement façade — à venir', "Suite à l'AG, les travaux de ravalement débuteront en juillet.", 'normale', 'brouillon', 0],
        ] as $a) {
            $data = ['tenant_id' => $t, 'residence_id' => $res->id, 'created_by' => $gest->id,
                'titre' => $a[0], 'contenu' => $a[1], 'priorite' => $a[2], 'statut' => $a[3]];
            if ($a[3] === 'publiee') {
                $data['publiee_at'] = now()->subDays($a[4]);
            }
            Annonce::create($data);
        }

        // ── 11. ASSEMBLÉES ──────────────────────────────────────────
        Assemblee::create(['tenant_id' => $t, 'residence_id' => $res->id, 'created_by' => $gest->id, 'titre' => 'AG Ordinaire 2025', 'type' => 'ordinaire', 'date' => '2025-06-21 15:00:00', 'lieu' => 'Salle commune, Résidence Aqualina', 'quorum_requis' => 50, 'ordre_du_jour' => "Approbation des comptes 2024\nBudget prévisionnel 2025", 'statut' => 'tenue', 'quorum_atteint' => true]);
        $ag2026 = Assemblee::create(['tenant_id' => $t, 'residence_id' => $res->id, 'created_by' => $gest->id, 'titre' => 'AG Ordinaire 2026', 'type' => 'ordinaire', 'date' => '2026-06-14 15:00:00', 'lieu' => 'Salle commune, Résidence Aqualina', 'quorum_requis' => 50, 'ordre_du_jour' => "Approbation des comptes 2025\nBudget prévisionnel 2026\nTravaux de ravalement façade", 'statut' => 'planifiee']);
        Assemblee::create(['tenant_id' => $t, 'residence_id' => $res->id, 'created_by' => $gest->id, 'titre' => 'AG Extraordinaire — Étanchéité toiture', 'type' => 'extraordinaire', 'date' => '2026-07-19 10:00:00', 'lieu' => 'Salle commune, Résidence Aqualina', 'quorum_requis' => 66, 'ordre_du_jour' => "Devis étanchéité toiture-terrasse\nVote prestataire", 'statut' => 'planifiee']);

        // ── 12. DOCUMENTS (vrais PDF générés) ───────────────────────
        $docs = [
            ['PV AG Ordinaire 2025', 'pv_ag', '2025-06-25', 'Procès-verbal de l\'assemblée générale ordinaire du 21 juin 2025. Comptes 2024 approuvés à la majorité. Budget 2025 voté.'],
            ['Règlement de copropriété — Aqualina', 'reglement', '2024-01-10', 'Règlement de copropriété de la Résidence Aqualina conformément à la loi 18-00 relative à la copropriété des immeubles bâtis.'],
            ['Contrat gardiennage 2026', 'contrat', '2026-01-01', 'Contrat de prestation de gardiennage 7/7 jour et nuit. Prestataire : Atlas Sécurité Privée. Montant annuel : 211 200 DH.'],
            ['Facture LYDEC — Q1 2026', 'facture', '2026-04-05', 'Facture consommation eau et électricité des parties communes, premier trimestre 2026.'],
            ['Police assurance multirisque 2026', 'autre', '2026-01-15', 'Police d\'assurance multirisque des parties communes. Assureur : Wiqaya Assurances. Prime annuelle : 6 000 DH.'],
            ['Devis prestation syndic 2026', 'autre', '2025-11-06', 'Devis de prestation de syndic — exercice 2026. Total annuel : 496 800 DH (41 400 DH/mois).'],
        ];
        $nbDoc = 0;
        foreach ($docs as $doc) {
            $path = 'documents/aqualina-'.($nbDoc + 1).'-'.\Illuminate\Support\Str::slug($doc[0]).'.pdf';
            $ko = $this->makePdf($doc[0], $doc[2], $doc[3], $path);
            Document::create([
                'tenant_id' => $t, 'residence_id' => $res->id, 'uploaded_by' => $manager->id,
                'nom' => $doc[0], 'type' => $doc[1], 'file_path' => $path,
                'mime_type' => 'application/pdf', 'taille_ko' => $ko, 'date' => $doc[2],
            ]);
            $nbDoc++;
        }

        // ── 13. ÉQUIPEMENTS ─────────────────────────────────────────
        foreach ([
            ['Ascenseurs OTIS Gen3 (4 cabines)', 'ascenseur', '2024-01-15', 480000, 240],
            ['Système filtration piscine Pentair', 'autre', '2024-03-10', 75000, 120],
            ['Centrale détection incendie', 'securite', '2024-02-01', 32000, 120],
            ['Groupe électrogène 60 kVA', 'autre', '2024-01-20', 95000, 180],
            ['Portail automatique + badges', 'securite', '2024-04-05', 28000, 96],
        ] as $eq) {
            $mois = Carbon::parse($eq[2])->diffInMonths(now());
            $vn = max(0, round($eq[3] - ($eq[3] / $eq[4]) * $mois, 2));
            Equipement::create([
                'tenant_id' => $t, 'residence_id' => $res->id, 'designation' => $eq[0], 'categorie' => $eq[1],
                'date_acquisition' => $eq[2], 'valeur_acquisition' => $eq[3], 'duree_amortissement_mois' => $eq[4],
                'valeur_nette' => $vn, 'notes' => null, 'actif' => true,
            ]);
        }

        // ── 14. EMPRUNTS ────────────────────────────────────────────
        Emprunt::create(['tenant_id' => $t, 'residence_id' => $res->id, 'libelle' => 'Crédit installation ascenseurs', 'organisme' => 'CIH Bank', 'date_debut' => '2025-01-15', 'date_fin' => '2029-01-15', 'montant_initial' => 480000, 'taux_interet' => 5.25, 'duree_mois' => 48, 'mensualite' => 11100, 'paye_cumule' => 188700, 'paye_exercice' => 66600, 'reste' => 291300, 'statut' => 'actif', 'notes' => 'Voté AG 2024.']);
        Emprunt::create(['tenant_id' => $t, 'residence_id' => $res->id, 'libelle' => 'Prêt aménagement espaces verts', 'organisme' => 'Banque Populaire', 'date_debut' => '2022-09-01', 'date_fin' => '2025-09-01', 'montant_initial' => 120000, 'taux_interet' => 6.00, 'duree_mois' => 36, 'mensualite' => 3650, 'paye_cumule' => 120000, 'paye_exercice' => 0, 'reste' => 0, 'statut' => 'rembourse', 'notes' => 'Remboursé en septembre 2025.']);

        // ── 15. TRAVAUX EXCEPTIONNELS ───────────────────────────────
        TravauxExceptionnel::create(['tenant_id' => $t, 'residence_id' => $res->id, 'libelle' => 'Étanchéité toiture-terrasse', 'description' => 'Réfection complète de l\'étanchéité après infiltrations.', 'date_vote_ag' => '2025-06-21', 'ag_id' => null, 'prestataire' => 'Toiture Pro Casablanca', 'montant_vote' => 180000, 'montant_engage' => 180000, 'montant_regle' => 120000, 'date_debut' => '2026-05-01', 'date_fin_prevue' => '2026-08-15', 'date_fin_reelle' => null, 'statut' => 'en_cours']);
        TravauxExceptionnel::create(['tenant_id' => $t, 'residence_id' => $res->id, 'libelle' => 'Ravalement façade Bloc A', 'description' => 'Nettoyage, enduit, peinture anti-humidité.', 'date_vote_ag' => '2026-06-14', 'ag_id' => $ag2026->id, 'prestataire' => null, 'montant_vote' => 250000, 'montant_engage' => 0, 'montant_regle' => 0, 'date_debut' => null, 'date_fin_prevue' => null, 'date_fin_reelle' => null, 'statut' => 'vote']);
        TravauxExceptionnel::create(['tenant_id' => $t, 'residence_id' => $res->id, 'libelle' => 'Mise aux normes électriques RDC', 'description' => 'Remplacement tableau électrique parties communes.', 'date_vote_ag' => '2025-06-21', 'ag_id' => null, 'prestataire' => 'ElecPro Maroc', 'montant_vote' => 45000, 'montant_engage' => 45000, 'montant_regle' => 45000, 'date_debut' => '2025-11-10', 'date_fin_prevue' => '2025-12-20', 'date_fin_reelle' => '2025-12-18', 'statut' => 'termine']);

        // ── 16. REMBOURSEMENTS ──────────────────────────────────────
        Remboursement::create(['tenant_id' => $t, 'residence_id' => $res->id, 'coproprietaire_id' => $copros[0]['copro']->id, 'coproprietaire_nom' => $copros[0]['nom'], 'lot_numero' => $copros[0]['lot']->numero, 'motif' => 'trop_percu', 'description' => 'Double paiement Q1 2026.', 'montant' => 950, 'date_demande' => '2026-04-05', 'date_paiement' => '2026-04-15', 'mode_paiement' => 'virement', 'reference' => 'REMB-2026-001', 'statut' => 'paye']);
        Remboursement::create(['tenant_id' => $t, 'residence_id' => $res->id, 'coproprietaire_id' => $copros[5]['copro']->id, 'coproprietaire_nom' => $copros[5]['nom'], 'lot_numero' => $copros[5]['lot']->numero, 'motif' => 'erreur_appel', 'description' => 'Erreur tantième sur appel Q2.', 'montant' => 200, 'date_demande' => '2026-05-10', 'date_paiement' => null, 'mode_paiement' => null, 'reference' => null, 'statut' => 'approuve']);
        Remboursement::create(['tenant_id' => $t, 'residence_id' => $res->id, 'coproprietaire_id' => $copros[9]['copro']->id, 'coproprietaire_nom' => $copros[9]['nom'], 'lot_numero' => $copros[9]['lot']->numero, 'motif' => 'indemnite', 'description' => 'Dégât des eaux parties communes.', 'montant' => 3200, 'date_demande' => '2026-03-25', 'date_paiement' => null, 'mode_paiement' => null, 'reference' => null, 'statut' => 'demande']);

        // ── 17. OCCUPANTS ───────────────────────────────────────────
        foreach (array_slice($copros, 0, 10) as $i => $c) {
            $loc = $i % 3 === 0;
            Occupant::create([
                'tenant_id' => $t, 'lot_id' => $c['lot']->id, 'coproprietaire_id' => $c['copro']->id,
                'nom' => $loc ? 'Locataire de '.$c['nom'] : $c['nom'], 'telephone' => $c['user']->phone,
                'type' => $loc ? 'locataire' : 'proprietaire_occupant',
                'date_debut' => '2025-0'.rand(1, 9).'-01', 'date_fin' => $loc ? '2027-12-31' : null,
            ]);
        }

        // ── 18. PÉNALITÉS + CALENDRIER CONFORMITÉ + AUDIT ───────────
        PenaltyConfig::create(['residence_id' => $res->id, 'enabled' => true, 'grace_period_days' => 15,
            'rate_type' => 'percentage', 'rate_value' => 5.00, 'cap_max_montant' => 5000.00, 'ag_approved_at' => now()->subMonths(5)]);

        try {
            (new ComplianceCalendarService())->seedForExercice($res->id, 2026);
        } catch (\Throwable $e) {
            $this->command->warn('  Calendrier conformité ignoré: '.$e->getMessage());
        }

        $this->seedAudit($manager, $gest);

        // ── 19. NOTIFICATIONS ───────────────────────────────────────
        foreach ([
            ['paiement', 'Paiement reçu', $copros[1]['nom'].' a réglé ses charges Q2 — Lot '.$copros[1]['lot']->numero, false, 1],
            ['ticket', 'Nouvelle réclamation', $copros[0]['nom'].' : « Ascenseur Bloc B bloqué »', false, 1],
            ['retard', 'Impayé détecté', $copros[3]['nom'].' — Lot '.$copros[3]['lot']->numero.' : charges Q2 en retard', false, 4],
            ['assemblee', 'AG planifiée', 'AG Ordinaire 2026 prévue le 14 juin — Aqualina', true, 10],
            ['paiement', 'Paiement partiel', $copros[4]['nom'].' a réglé 50% de ses charges Q2', false, 3],
            ['info', 'Budget approuvé', 'Budget 2026 approuvé — 496 800 DH', true, 30],
        ] as $no) {
            Notification::create(['tenant_id' => $t, 'user_id' => $gest->id, 'type' => $no[0], 'title' => $no[1],
                'message' => $no[2], 'read' => $no[3], 'created_at' => now()->subDays($no[4]), 'updated_at' => now()->subDays($no[4])]);
        }

        $impayes = Coproprietaire::where('tenant_id', $t)->where('solde_actuel', '<', 0)->count();
        $this->command->info("✅ TestSyndic COMPLET seedé (nov-2025 → aujourd'hui) :");
        $this->command->info("   75 lots · {$resCount} copros · {$impayes} impayés · 3 appels de fonds · ".Depense::where('tenant_id', $t)->count().' dépenses · '.$nbDoc.' documents PDF');
        $this->command->info('   Manager : manager@testsyndic.ma / Testsyndic2026');
    }

    private function user(string $name, string $phone, string $email, string $role, ?array $prefs = null): User
    {
        $u = User::create(array_filter([
            'tenant_id' => $this->t, 'name' => $name, 'phone' => $phone, 'email' => $email,
            'password' => bcrypt('Testsyndic2026'), 'role' => $role, 'status' => 'active',
            'notification_prefs' => $prefs,
        ], fn ($v) => $v !== null));
        $u->assignRole($role);

        return $u;
    }

    private function appelEtPaie(Residence $res, Exercice $ex, User $by, string $libelle, string $desc, float $montant, string $sent, string $echeance, string $statut, array $modes, int &$n, string $mode): void
    {
        $appel = AppelFonds::withoutGlobalScope('tenant')->create([
            'tenant_id' => $this->t, 'residence_id' => $res->id, 'exercice_id' => $ex->id, 'created_by' => $by->id,
            'libelle' => $libelle, 'description' => $desc, 'montant_total' => $montant,
            'date_echeance' => Carbon::parse($echeance), 'statut' => $statut, 'sent_at' => Carbon::parse($sent),
        ]);
        $appel->genererLignes();
        $lignes = $appel->lignes()->with('coproprietaire')->get();

        $full = $mode === 'all' ? $lignes->count() : max(1, $lignes->count() - 13);
        foreach ($lignes->take($full) as $i => $ligne) {
            Paiement::create([
                'tenant_id' => $this->t, 'exercice_id' => $ex->id, 'coproprietaire_id' => $ligne->coproprietaire_id,
                'appel_fonds_ligne_id' => $ligne->id, 'saisi_par' => $by->id, 'montant' => $ligne->montant_du,
                'mode' => $modes[$i % count($modes)], 'reference' => 'PAY-AQ-'.str_pad((string) $n++, 4, '0', STR_PAD_LEFT),
                'date_paiement' => Carbon::parse($sent)->addDays(rand(5, 60)),
            ]);
            $ligne->update(['montant_paye' => $ligne->montant_du, 'statut' => 'paye', 'date_paiement' => Carbon::parse($echeance)]);
            $ligne->coproprietaire->recalculerSolde();
        }
        if ($mode === 'partial') {
            foreach ($lignes->skip($full)->take(5) as $ligne) {
                $p = round($ligne->montant_du * 0.5, 2);
                Paiement::create([
                    'tenant_id' => $this->t, 'exercice_id' => $ex->id, 'coproprietaire_id' => $ligne->coproprietaire_id,
                    'appel_fonds_ligne_id' => $ligne->id, 'saisi_par' => $by->id, 'montant' => $p,
                    'mode' => 'especes', 'reference' => 'PAY-AQ-PART-'.str_pad((string) $ligne->id, 3, '0', STR_PAD_LEFT),
                    'date_paiement' => now()->subDays(8),
                ]);
                $ligne->update(['montant_paye' => $p, 'statut' => 'partiel']);
                $ligne->coproprietaire->recalculerSolde();
            }
            foreach ($lignes->skip($full + 5) as $ligne) {
                $ligne->coproprietaire->recalculerSolde();
            }
            $appel->update(['statut' => 'partiel']);
        }
    }

    /** Génère un vrai PDF (dompdf) sur le disque public, retourne la taille en Ko. */
    private function makePdf(string $titre, string $date, string $corps, string $path): int
    {
        $html = '<html><head><meta charset="utf-8"><style>body{font-family:DejaVu Sans,sans-serif;padding:40px;color:#222}'
            .'h1{color:#1d4ed8;font-size:20px;border-bottom:2px solid #1d4ed8;padding-bottom:8px}'
            .'.meta{color:#666;font-size:12px;margin-bottom:24px}.body{font-size:13px;line-height:1.6}'
            .'.footer{margin-top:60px;font-size:11px;color:#999;border-top:1px solid #ddd;padding-top:8px}</style></head>'
            .'<body><h1>'.htmlspecialchars($titre).'</h1>'
            .'<div class="meta">Résidence Aqualina · TestSyndic · '.htmlspecialchars($date).'</div>'
            .'<div class="body">'.nl2br(htmlspecialchars($corps)).'</div>'
            .'<div class="footer">Document de démonstration généré par imaro — conforme à la loi 18-00 sur la copropriété.</div>'
            .'</body></html>';

        $bytes = Pdf::loadHTML($html)->setPaper('a4')->output();
        Storage::disk('public')->put($path, $bytes);

        return max(1, (int) ceil(strlen($bytes) / 1024));
    }

    private function seedAudit(User $manager, User $gest): void
    {
        $logs = [
            [$manager, 'auth', 'Auth.login', 'info', null, null, $manager->name, 30],
            [$manager, 'budget', 'Budget.approved', 'sensitive', 'Budget', 1, 'Budget 2026 — Aqualina', 28],
            [$gest, 'coproprietaire', 'Coproprietaire.created', 'info', 'Coproprietaire', 5, 'Import copropriétaires', 27],
            [$gest, 'paiement', 'Paiement.created', 'info', 'Paiement', 30, 'Encaissement Q1', 20],
            [$gest, 'depense', 'Depense.created', 'info', 'Depense', 10, 'Facture gardiennage', 12],
            [null, 'auth', 'Auth.failed_login', 'warning', null, null, 'Tentative échouée', 3],
            [$manager, 'document', 'Document.uploaded', 'info', 'Document', 1, 'PV AG 2025.pdf', 2],
        ];
        foreach ($logs as $l) {
            AuditLog::create([
                'tenant_id' => $this->t, 'user_id' => $l[0]?->id, 'user_email' => $l[0]?->email ?? 'inconnu@fake.com',
                'category' => $l[1], 'action' => $l[2], 'severity' => $l[3], 'target_type' => $l[4],
                'target_id' => $l[5], 'target_label' => $l[6], 'ip_address' => '105.66.12.34',
                'user_agent' => 'Mozilla/5.0 Chrome/125.0', 'created_at' => now()->subDays($l[7]),
            ]);
        }
    }
}
