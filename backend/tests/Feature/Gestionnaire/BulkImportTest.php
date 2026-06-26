<?php

use App\Models\Coproprietaire;
use App\Models\Exercice;
use App\Models\Immeuble;
use App\Models\Lot;
use App\Models\Paiement;
use App\Models\Prestataire;
use App\Models\Residence;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Role;

uses(RefreshDatabase::class);

// ─── Setup commun ────────────────────────────────────────────────────────────

beforeEach(function () {
    foreach (['super_admin', 'manager', 'gestionnaire', 'agent_recouvrement', 'conseil', 'resident'] as $role) {
        Role::firstOrCreate(['name' => $role, 'guard_name' => 'web']);
    }

    $this->tenant = Tenant::create([
        'name' => 'Test Syndic', 'email' => 'test@syndic.ma',
        'subdomain' => 'test', 'plan' => 'starter', 'status' => 'active',
    ]);
    config(['app.tenant_id' => $this->tenant->id]);

    $this->gestionnaire = User::create([
        'tenant_id' => $this->tenant->id,
        'name'      => 'Karim Gestionnaire',
        'phone'     => '+212611000001',
        'role'      => 'gestionnaire',
        'status'    => 'active',
    ]);
    $this->gestionnaire->assignRole('gestionnaire');

    $this->residence = Residence::withoutGlobalScopes()->create([
        'tenant_id'       => $this->tenant->id,
        'gestionnaire_id' => $this->gestionnaire->id,
        'name'            => 'Résidence Atlas',
        'address'         => 'Rue Hassan II',
        'city'            => 'Casablanca',
        'total_tantieme'  => 1000,
        'nb_lots'         => 0,
        'status'          => 'active',
        'mode_cotisation' => 'tantieme',
    ]);

    $this->immeuble = Immeuble::withoutGlobalScopes()->create([
        'tenant_id'    => $this->tenant->id,
        'residence_id' => $this->residence->id,
        'nom'          => 'Bâtiment A',
        'nb_etages'    => 5,
        'nb_lots'      => 0,
    ]);

    // Exercice actif pour les tests import-paiements
    $this->exercice = Exercice::withoutGlobalScopes()->create([
        'tenant_id'    => $this->tenant->id,
        'residence_id' => $this->residence->id,
        'annee'        => 2026,
        'date_debut'   => '2026-01-01',
        'date_fin'     => '2026-12-31',
        'statut'       => 'actif',
    ]);

    $this->token = $this->gestionnaire->createToken('test')->plainTextToken;
    $this->auth  = ['Authorization' => "Bearer {$this->token}"];
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

function createLotWithCopro(Residence $residence, Immeuble $immeuble, Tenant $tenant, string $numero, float $tantieme): array
{
    $resident = User::create([
        'tenant_id' => $tenant->id,
        'name'      => "Résident {$numero}",
        'phone'     => '+21261' . str_pad(rand(1000000, 9999999), 7, '0'),
        'role'      => 'resident',
        'status'    => 'active',
    ]);
    $lot = Lot::create([
        'tenant_id'    => $tenant->id,
        'residence_id' => $residence->id,
        'immeuble_id'  => $immeuble->id,
        'numero'       => $numero,
        'type'         => 'appartement',
        'etage'        => 1,
        'tantieme'     => $tantieme,
    ]);
    $copro = Coproprietaire::create([
        'tenant_id'    => $tenant->id,
        'user_id'      => $resident->id,
        'lot_id'       => $lot->id,
        'type'         => 'proprietaire',
        'solde_actuel' => 0,
    ]);
    return [$lot, $copro];
}

// ═════════════════════════════════════════════════════════════════════════════
// 1. POST /residences/{id}/lots/bulk
// ═════════════════════════════════════════════════════════════════════════════

describe('lots/bulk', function () {
    it('crée plusieurs lots en une requête', function () {
        $response = $this->withHeaders($this->auth)
            ->postJson("/api/gestionnaire/residences/{$this->residence->id}/lots/bulk", [
                'lots' => [
                    ['numero' => 'B01', 'titre_foncier' => 'TF/B01', 'type' => 'appartement', 'etage' => 1, 'tantieme' => 300],
                    ['numero' => 'B02', 'titre_foncier' => 'TF/B02', 'type' => 'appartement', 'etage' => 2, 'tantieme' => 250],
                    ['numero' => 'B03', 'titre_foncier' => 'TF/B03', 'type' => 'parking',     'etage' => 0, 'tantieme' => 100],
                ],
            ])
            ->assertStatus(200)
            ->assertJsonPath('status', 'success')
            ->assertJsonPath('data.created', 3)
            ->assertJsonPath('data.errors', []);

        expect(Lot::where('residence_id', $this->residence->id)->count())->toBe(3);
        $this->residence->refresh();
        expect($this->residence->nb_lots)->toBe(3);
    });

    it('ignore un lot en doublon et le signale dans errors', function () {
        Lot::create([
            'tenant_id' => $this->tenant->id, 'residence_id' => $this->residence->id,
            'immeuble_id' => $this->immeuble->id, 'numero' => 'B01',
            'type' => 'appartement', 'etage' => 1, 'tantieme' => 300,
        ]);

        $response = $this->withHeaders($this->auth)
            ->postJson("/api/gestionnaire/residences/{$this->residence->id}/lots/bulk", [
                'lots' => [
                    ['numero' => 'B01', 'titre_foncier' => 'TF/B01', 'type' => 'appartement', 'etage' => 1, 'tantieme' => 300],
                    ['numero' => 'B02', 'titre_foncier' => 'TF/B02', 'type' => 'appartement', 'etage' => 2, 'tantieme' => 200],
                ],
            ])
            ->assertStatus(200)
            ->assertJsonPath('data.created', 1);

        expect($response->json('data.errors'))->toHaveCount(1);
        expect($response->json('data.errors.0'))->toContain('B01');
    });

    it('refuse un tantième qui dépasserait le total', function () {
        $response = $this->withHeaders($this->auth)
            ->postJson("/api/gestionnaire/residences/{$this->residence->id}/lots/bulk", [
                'lots' => [
                    ['numero' => 'B01', 'titre_foncier' => 'TF/B01', 'type' => 'appartement', 'etage' => 1, 'tantieme' => 600],
                    ['numero' => 'B02', 'titre_foncier' => 'TF/B02', 'type' => 'appartement', 'etage' => 2, 'tantieme' => 500], // 600+500 > 1000
                ],
            ])
            ->assertStatus(200);

        expect($response->json('data.created'))->toBe(1)
            ->and($response->json('data.errors'))->toHaveCount(1);
    });

    it('utilise un immeuble_id spécifique si fourni', function () {
        $autreImmeuble = Immeuble::withoutGlobalScopes()->create([
            'tenant_id' => $this->tenant->id, 'residence_id' => $this->residence->id,
            'nom' => 'Bâtiment B', 'nb_etages' => 3, 'nb_lots' => 0,
        ]);

        $this->withHeaders($this->auth)
            ->postJson("/api/gestionnaire/residences/{$this->residence->id}/lots/bulk", [
                'lots' => [
                    ['numero' => 'C01', 'titre_foncier' => 'TF/C01', 'type' => 'appartement', 'etage' => 1, 'tantieme' => 100, 'immeuble_id' => $autreImmeuble->id],
                ],
            ])
            ->assertStatus(200)
            ->assertJsonPath('data.created', 1);

        expect(Lot::where('numero', 'C01')->first()->immeuble_id)->toBe($autreImmeuble->id);
    });

    it('retourne 403 si le gestionnaire n\'est pas assigné à la résidence', function () {
        $autreGestionnaire = User::create([
            'tenant_id' => $this->tenant->id, 'name' => 'Autre Gest',
            'phone' => '+212611999999', 'role' => 'gestionnaire', 'status' => 'active',
        ]);
        $autreGestionnaire->assignRole('gestionnaire');
        $token = $autreGestionnaire->createToken('t')->plainTextToken;

        $this->withHeaders(['Authorization' => "Bearer {$token}"])
            ->postJson("/api/gestionnaire/residences/{$this->residence->id}/lots/bulk", [
                'lots' => [['numero' => 'X01', 'type' => 'appartement', 'etage' => 1, 'tantieme' => 100]],
            ])
            ->assertStatus(403);
    });

    it('rejette une requête sans lots', function () {
        $this->withHeaders($this->auth)
            ->postJson("/api/gestionnaire/residences/{$this->residence->id}/lots/bulk", [])
            ->assertStatus(422);
    });
});

// ═════════════════════════════════════════════════════════════════════════════
// 2. POST /coproprietaires/bulk
// ═════════════════════════════════════════════════════════════════════════════

describe('coproprietaires/bulk', function () {
    it('crée plusieurs copropriétaires avec leurs users', function () {
        $lot1 = Lot::create(['tenant_id' => $this->tenant->id, 'residence_id' => $this->residence->id, 'immeuble_id' => $this->immeuble->id, 'numero' => 'A01', 'type' => 'appartement', 'etage' => 1, 'tantieme' => 500]);
        $lot2 = Lot::create(['tenant_id' => $this->tenant->id, 'residence_id' => $this->residence->id, 'immeuble_id' => $this->immeuble->id, 'numero' => 'A02', 'type' => 'appartement', 'etage' => 2, 'tantieme' => 500]);

        $response = $this->withHeaders($this->auth)
            ->postJson('/api/gestionnaire/coproprietaires/bulk', [
                'coproprietaires' => [
                    ['name' => 'Hassan Benali', 'phone' => '+212611100001', 'lot_id' => $lot1->id, 'residence_id' => $this->residence->id],
                    ['name' => 'Fatima Chraibi', 'phone' => '+212611100002', 'email' => 'fatima@test.ma', 'lot_id' => $lot2->id, 'residence_id' => $this->residence->id],
                ],
            ])
            ->assertStatus(200)
            ->assertJsonPath('status', 'success')
            ->assertJsonPath('data.created', 2)
            ->assertJsonPath('data.errors', []);

        expect(User::where('phone', '+212611100001')->exists())->toBeTrue()
            ->and(Coproprietaire::where('lot_id', $lot1->id)->where('type', 'proprietaire')->exists())->toBeTrue();
    });

    it('ignore un lot déjà occupé (idempotence)', function () {
        [$lot] = createLotWithCopro($this->residence, $this->immeuble, $this->tenant, 'A01', 500);

        $response = $this->withHeaders($this->auth)
            ->postJson('/api/gestionnaire/coproprietaires/bulk', [
                'coproprietaires' => [
                    ['name' => 'Nouveau Prop', 'phone' => '+212611200001', 'lot_id' => $lot->id, 'residence_id' => $this->residence->id],
                ],
            ])
            ->assertStatus(200)
            ->assertJsonPath('data.created', 0);

        expect($response->json('data.errors'))->toHaveCount(1);
        expect(Coproprietaire::where('lot_id', $lot->id)->count())->toBe(1);
    });

    it('crée un User résident avec role resident', function () {
        $lot = Lot::create(['tenant_id' => $this->tenant->id, 'residence_id' => $this->residence->id, 'immeuble_id' => $this->immeuble->id, 'numero' => 'A01', 'type' => 'appartement', 'etage' => 1, 'tantieme' => 500]);

        $this->withHeaders($this->auth)
            ->postJson('/api/gestionnaire/coproprietaires/bulk', [
                'coproprietaires' => [
                    ['name' => 'Youssef Alami', 'phone' => '+212611300001', 'lot_id' => $lot->id, 'residence_id' => $this->residence->id],
                ],
            ])
            ->assertJsonPath('data.created', 1);

        $user = User::where('phone', '+212611300001')->first();
        expect($user)->not->toBeNull()
            ->and($user->role)->toBe('resident')
            ->and($user->status)->toBe('active');
    });

    it('rejette une entrée sans lot_id', function () {
        $this->withHeaders($this->auth)
            ->postJson('/api/gestionnaire/coproprietaires/bulk', [
                'coproprietaires' => [
                    ['name' => 'Prop sans lot', 'phone' => '+212611400001', 'residence_id' => $this->residence->id],
                ],
            ])
            ->assertStatus(422);
    });
});

// ═════════════════════════════════════════════════════════════════════════════
// 3. POST /residences/{id}/import-soldes
// ═════════════════════════════════════════════════════════════════════════════

describe('import-soldes', function () {
    it('met à jour le solde_actuel des copropriétaires', function () {
        [$lot1, $copro1] = createLotWithCopro($this->residence, $this->immeuble, $this->tenant, 'A01', 600);
        [$lot2, $copro2] = createLotWithCopro($this->residence, $this->immeuble, $this->tenant, 'A02', 400);

        $this->withHeaders($this->auth)
            ->postJson("/api/gestionnaire/residences/{$this->residence->id}/import-soldes", [
                'soldes' => [
                    ['lot_numero' => 'A01', 'montant' => -1500.00],
                    ['lot_numero' => 'A02', 'montant' => 0.00],
                ],
            ])
            ->assertStatus(200)
            ->assertJsonPath('status', 'success')
            ->assertJsonPath('data.imported', 2)
            ->assertJsonPath('data.errors', []);

        expect($copro1->fresh()->solde_actuel)->toBe(-1500.0)
            ->and($copro2->fresh()->solde_actuel)->toBe(0.0);
    });

    it('signale une erreur si le numéro de lot est inconnu', function () {
        $response = $this->withHeaders($this->auth)
            ->postJson("/api/gestionnaire/residences/{$this->residence->id}/import-soldes", [
                'soldes' => [
                    ['lot_numero' => 'INEXISTANT', 'montant' => 500],
                ],
            ])
            ->assertStatus(200)
            ->assertJsonPath('data.imported', 0);

        expect($response->json('data.errors'))->toHaveCount(1);
        expect($response->json('data.errors.0'))->toContain('INEXISTANT');
    });

    it('signale une erreur si le lot n\'a pas de copropriétaire principal', function () {
        Lot::create(['tenant_id' => $this->tenant->id, 'residence_id' => $this->residence->id, 'immeuble_id' => $this->immeuble->id, 'numero' => 'LOT_VIDE', 'type' => 'parking', 'etage' => 0, 'tantieme' => 100]);

        $response = $this->withHeaders($this->auth)
            ->postJson("/api/gestionnaire/residences/{$this->residence->id}/import-soldes", [
                'soldes' => [
                    ['lot_numero' => 'LOT_VIDE', 'montant' => 1000],
                ],
            ])
            ->assertStatus(200)
            ->assertJsonPath('data.imported', 0);

        expect($response->json('data.errors'))->toHaveCount(1);
    });

    it('accepte des montants négatifs (dettes)', function () {
        [$lot, $copro] = createLotWithCopro($this->residence, $this->immeuble, $this->tenant, 'A01', 500);

        $this->withHeaders($this->auth)
            ->postJson("/api/gestionnaire/residences/{$this->residence->id}/import-soldes", [
                'soldes' => [['lot_numero' => 'A01', 'montant' => -3200.50]],
            ])
            ->assertJsonPath('data.imported', 1);

        expect($copro->fresh()->solde_actuel)->toBe(-3200.5);
    });
});

// ═════════════════════════════════════════════════════════════════════════════
// 4. POST /residences/{id}/import-paiements
// ═════════════════════════════════════════════════════════════════════════════

describe('import-paiements', function () {
    it('crée des paiements historiques et met à jour le solde', function () {
        [$lot1, $copro1] = createLotWithCopro($this->residence, $this->immeuble, $this->tenant, 'A01', 600);
        [$lot2, $copro2] = createLotWithCopro($this->residence, $this->immeuble, $this->tenant, 'A02', 400);

        $this->withHeaders($this->auth)
            ->postJson("/api/gestionnaire/residences/{$this->residence->id}/import-paiements", [
                'paiements' => [
                    ['lot_numero' => 'A01', 'montant' => 1200, 'date' => '2026-01-15', 'mode' => 'virement', 'trimestre' => 'T1 2026'],
                    ['lot_numero' => 'A02', 'montant' => 800,  'date' => '2026-01-20', 'mode' => 'cheque', 'reference' => 'CHQ-042'],
                ],
            ])
            ->assertStatus(200)
            ->assertJsonPath('status', 'success')
            ->assertJsonPath('data.imported', 2)
            ->assertJsonPath('data.errors', []);

        expect(Paiement::where('coproprietaire_id', $copro1->id)->count())->toBe(1)
            ->and(Paiement::where('coproprietaire_id', $copro2->id)->count())->toBe(1);

        // Solde mis à jour
        expect($copro1->fresh()->solde_actuel)->toBe(1200.0)
            ->and($copro2->fresh()->solde_actuel)->toBe(800.0);
    });

    it('crée le paiement avec appel_fonds_ligne_id null', function () {
        [$lot, $copro] = createLotWithCopro($this->residence, $this->immeuble, $this->tenant, 'A01', 500);

        $this->withHeaders($this->auth)
            ->postJson("/api/gestionnaire/residences/{$this->residence->id}/import-paiements", [
                'paiements' => [
                    ['lot_numero' => 'A01', 'montant' => 500, 'date' => '2026-02-01', 'mode' => 'especes'],
                ],
            ])
            ->assertJsonPath('data.imported', 1);

        $paiement = Paiement::where('coproprietaire_id', $copro->id)->first();
        expect($paiement->appel_fonds_ligne_id)->toBeNull()
            ->and($paiement->exercice_id)->toBe($this->exercice->id);
    });

    it('stocke le trimestre dans la note du paiement', function () {
        [$lot, $copro] = createLotWithCopro($this->residence, $this->immeuble, $this->tenant, 'A01', 500);

        $this->withHeaders($this->auth)
            ->postJson("/api/gestionnaire/residences/{$this->residence->id}/import-paiements", [
                'paiements' => [
                    ['lot_numero' => 'A01', 'montant' => 500, 'date' => '2026-03-01', 'mode' => 'virement', 'trimestre' => 'T1 2026'],
                ],
            ]);

        $note = Paiement::where('coproprietaire_id', $copro->id)->value('note');
        expect($note)->toContain('T1 2026');
    });

    it('signale une erreur pour un lot introuvable', function () {
        $response = $this->withHeaders($this->auth)
            ->postJson("/api/gestionnaire/residences/{$this->residence->id}/import-paiements", [
                'paiements' => [
                    ['lot_numero' => 'ZZZNEXISTE', 'montant' => 100, 'date' => '2026-01-01', 'mode' => 'virement'],
                ],
            ])
            ->assertStatus(200)
            ->assertJsonPath('data.imported', 0);

        expect($response->json('data.errors'))->toHaveCount(1);
        expect(Paiement::count())->toBe(0);
    });

    it('rejette un mode invalide', function () {
        $this->withHeaders($this->auth)
            ->postJson("/api/gestionnaire/residences/{$this->residence->id}/import-paiements", [
                'paiements' => [
                    ['lot_numero' => 'A01', 'montant' => 500, 'date' => '2026-01-01', 'mode' => 'bitcoin'],
                ],
            ])
            ->assertStatus(422);
    });
});

// ═════════════════════════════════════════════════════════════════════════════
// 5. POST /prestataires/bulk
// ═════════════════════════════════════════════════════════════════════════════

describe('prestataires/bulk', function () {
    it('crée plusieurs prestataires', function () {
        $this->withHeaders($this->auth)
            ->postJson('/api/gestionnaire/prestataires/bulk', [
                'prestataires' => [
                    ['nom' => 'Atlas Électricité', 'metier' => 'electricite', 'telephone' => '+212522100001'],
                    ['nom' => 'Casa Plomberie',    'metier' => 'plomberie',   'telephone' => '+212522100002', 'email' => 'plomberie@test.ma'],
                    ['nom' => 'Verde Jardinage',   'metier' => 'jardinage',   'telephone' => '+212522100003', 'ville' => 'Casablanca'],
                ],
            ])
            ->assertStatus(200)
            ->assertJsonPath('status', 'success')
            ->assertJsonPath('data.created', 3)
            ->assertJsonPath('data.errors', []);

        expect(Prestataire::where('tenant_id', $this->tenant->id)->count())->toBe(3);

        // Vérifier que 'metier' est bien stocké dans 'specialite'
        $p = Prestataire::where('telephone', '+212522100001')->first();
        expect($p->specialite)->toBe('electricite');
    });

    it('ignore un doublon de téléphone (idempotence)', function () {
        Prestataire::create([
            'tenant_id' => $this->tenant->id,
            'nom'       => 'Existant SARL',
            'specialite'=> 'electricite',
            'telephone' => '+212522100001',
        ]);

        $response = $this->withHeaders($this->auth)
            ->postJson('/api/gestionnaire/prestataires/bulk', [
                'prestataires' => [
                    ['nom' => 'Copie Existant', 'metier' => 'electricite', 'telephone' => '+212522100001'],
                    ['nom' => 'Nouveau SARL',   'metier' => 'plomberie',   'telephone' => '+212522100009'],
                ],
            ])
            ->assertStatus(200)
            ->assertJsonPath('data.created', 1);

        expect($response->json('data.errors'))->toHaveCount(1);
        expect(Prestataire::where('tenant_id', $this->tenant->id)->count())->toBe(2); // 1 existant + 1 nouveau
    });

    it('rejette une entrée sans nom', function () {
        $this->withHeaders($this->auth)
            ->postJson('/api/gestionnaire/prestataires/bulk', [
                'prestataires' => [
                    ['metier' => 'plomberie', 'telephone' => '+212522200001'],
                ],
            ])
            ->assertStatus(422);
    });

    it('rejette une entrée sans metier', function () {
        $this->withHeaders($this->auth)
            ->postJson('/api/gestionnaire/prestataires/bulk', [
                'prestataires' => [
                    ['nom' => 'Prestataire X', 'telephone' => '+212522200002'],
                ],
            ])
            ->assertStatus(422);
    });

    it('accepte un email optionnel et une ville ignorée sans erreur', function () {
        $this->withHeaders($this->auth)
            ->postJson('/api/gestionnaire/prestataires/bulk', [
                'prestataires' => [
                    ['nom' => 'Techni SARL', 'metier' => 'ascenseur', 'telephone' => '+212522300001', 'email' => 'contact@techni.ma', 'ville' => 'Rabat'],
                ],
            ])
            ->assertStatus(200)
            ->assertJsonPath('data.created', 1);

        $p = Prestataire::where('telephone', '+212522300001')->first();
        expect($p->email)->toBe('contact@techni.ma');
    });
});
