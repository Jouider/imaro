<?php

namespace Database\Seeders;

use App\Models\AppelFonds;
use App\Models\Coproprietaire;
use App\Models\Lot;
use App\Models\Paiement;
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

        // ── 2. Users ───────────────────────────────────────────
        $manager = User::create([
            'tenant_id' => $tenant->id,
            'name' => 'Mohammed Fikri',
            'phone' => '+212600000001',
            'email' => 'fikri@blancasyndic.ma',
            'role' => 'manager',
            'status' => 'active',
        ]);
        $manager->assignRole('manager');

        $gestionnaire1 = User::create([
            'tenant_id' => $tenant->id,
            'name' => 'Karim Alaoui',
            'phone' => '+212600000002',
            'role' => 'gestionnaire',
            'status' => 'active',
        ]);
        $gestionnaire1->assignRole('gestionnaire');

        $gestionnaire2 = User::create([
            'tenant_id' => $tenant->id,
            'name' => 'Leila Mansouri',
            'phone' => '+212600000003',
            'role' => 'gestionnaire',
            'status' => 'active',
        ]);
        $gestionnaire2->assignRole('gestionnaire');

        // ── 3. Résidence ───────────────────────────────────────
        config(['app.tenant_id' => $tenant->id]);

        $residence = Residence::withoutGlobalScope('tenant')->create([
            'tenant_id' => $tenant->id,
            'gestionnaire_id' => $gestionnaire1->id,
            'name' => 'Résidence Atlas',
            'address' => '12 Boulevard Zerktouni',
            'city' => 'Casablanca',
            'total_tantieme' => 1000,
            'nb_lots' => 20,
            'status' => 'active',
        ]);

        // ── 4. Lots avec tantièmes (somme = 1000) ──────────────
        $nomsMarocains = [
            'Hassan Benali', 'Fatima Chraibi', 'Youssef Tazi',
            'Nadia Berrada', 'Omar Fassi', 'Amina Kettani',
            'Rachid Squalli', 'Houda Lahlou', 'Mehdi Bensouda',
            'Souad El Amrani', 'Khalid Bennani', 'Zineb Tahiri',
            'Samir Cherkaoui', 'Khadija Benhaddou', 'Adil Ziani',
            'Meriem Ouazzani', 'Tariq Lamrani', 'Hafida Ghazi',
            'Younes Sabri', 'Rajaa Filali',
        ];

        // Tantièmes : 20 lots, somme = 1000 ✓
        $tantiemes = [
            60, 55, 50, 50, 50, 50, 50, 50, 50, 50,
            50, 50, 50, 50, 50, 50, 45, 45, 45, 45,
        ];

        $coproprietaires = [];

        foreach ($nomsMarocains as $i => $nom) {
            $lot = Lot::create([
                'tenant_id' => $tenant->id,
                'residence_id' => $residence->id,
                'numero' => 'Apt '.($i + 1),
                'etage' => (int) floor($i / 4) + 1,
                'type' => 'appartement',
                'superficie' => rand(65, 120),
                'tantieme' => $tantiemes[$i],
            ]);

            $user = User::create([
                'tenant_id' => $tenant->id,
                'name' => $nom,
                'phone' => '+2126'.str_pad($i + 10, 8, '0', STR_PAD_LEFT),
                'email' => strtolower(str_replace(' ', '.', $nom)).'@email.ma',
                'role' => 'resident',
                'status' => 'active',
            ]);
            $user->assignRole('resident');

            $copro = Coproprietaire::create([
                'tenant_id' => $tenant->id,
                'user_id' => $user->id,
                'lot_id' => $lot->id,
                'type' => 'proprietaire',
                'date_entree' => now()->subMonths(rand(6, 36)),
                'solde_actuel' => 0,
            ]);

            $coproprietaires[] = ['copro' => $copro, 'lot' => $lot];
        }

        // ── 5. Appel de fonds ──────────────────────────────────
        $appelFonds = AppelFonds::withoutGlobalScope('tenant')->create([
            'tenant_id' => $tenant->id,
            'residence_id' => $residence->id,
            'created_by' => $gestionnaire1->id,
            'libelle' => 'Charges Q2 2026',
            'description' => 'Charges communes : gardiennage, ascenseur, nettoyage',
            'montant_total' => 18000,
            'date_echeance' => Carbon::now()->addDays(15),
            'statut' => 'envoye',
            'sent_at' => now()->subDays(3),
        ]);

        $appelFonds->genererLignes();

        // ── 6. Paiements (75% payés = 15 sur 20) ──────────────
        $lignes = $appelFonds->lignes()->with('coproprietaire')->get();

        foreach ($lignes->take(15) as $ligne) {
            Paiement::create([
                'tenant_id' => $tenant->id,
                'coproprietaire_id' => $ligne->coproprietaire_id,
                'appel_fonds_ligne_id' => $ligne->id,
                'saisi_par' => $gestionnaire1->id,
                'montant' => $ligne->montant_du,
                'mode' => collect(['virement', 'cheque', 'especes'])->random(),
                'reference' => 'PAY-2026-'.str_pad($ligne->id, 4, '0', STR_PAD_LEFT),
                'date_paiement' => now()->subDays(rand(1, 10)),
            ]);

            $ligne->update([
                'montant_paye' => $ligne->montant_du,
                'statut' => 'paye',
                'date_paiement' => now()->subDays(rand(1, 10)),
            ]);

            $ligne->coproprietaire->recalculerSolde();
        }

        foreach ($lignes->skip(15) as $ligne) {
            $ligne->coproprietaire->recalculerSolde();
        }

        $appelFonds->update(['statut' => 'partiel']);

        // ── 7. Tickets ─────────────────────────────────────────
        Ticket::create([
            'tenant_id' => $tenant->id,
            'residence_id' => $residence->id,
            'user_id' => $coproprietaires[0]['copro']->user_id,
            'categorie' => 'ascenseur',
            'description' => "L'ascenseur est en panne depuis ce matin. Urgent.",
            'priorite' => 'urgent',
            'statut' => 'ouvert',
        ]);

        Ticket::create([
            'tenant_id' => $tenant->id,
            'residence_id' => $residence->id,
            'user_id' => $coproprietaires[3]['copro']->user_id,
            'categorie' => 'plomberie',
            'description' => "Fuite d'eau au niveau du 2ème étage couloir.",
            'priorite' => 'normal',
            'statut' => 'en_cours',
        ]);

        Ticket::create([
            'tenant_id' => $tenant->id,
            'residence_id' => $residence->id,
            'user_id' => $coproprietaires[7]['copro']->user_id,
            'categorie' => 'proprete',
            'description' => 'Les poubelles du rez-de-chaussée débordent.',
            'priorite' => 'faible',
            'statut' => 'ouvert',
        ]);

        $this->command->info('✅ DemoSeeder terminé !');
        $this->command->info('   Tenant    : Blanca Syndic (subdomain: blanca)');
        $this->command->info('   Manager   : Mohammed Fikri (+212600000001)');
        $this->command->info('   Résidence : Résidence Atlas · 20 lots · 1 000 tantièmes');
        $this->command->info('   Appel     : Charges Q2 2026 · 18 000 DH · 15/20 payés');
        $this->command->info('   Tickets   : 3 (1 urgent, 1 en cours, 1 faible)');
    }
}
