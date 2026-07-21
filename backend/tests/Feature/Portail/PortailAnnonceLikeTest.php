<?php

use App\Models\Annonce;
use App\Models\Coproprietaire;
use App\Models\Immeuble;
use App\Models\Lot;
use App\Models\Residence;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Role;

uses(RefreshDatabase::class);

beforeEach(function () {
    foreach (['gestionnaire', 'resident'] as $r) {
        Role::firstOrCreate(['name' => $r, 'guard_name' => 'web']);
    }

    $this->tenant = Tenant::create(['name' => 'T', 'email' => 't@t.ma', 'subdomain' => 't', 'plan' => 'starter', 'status' => 'active']);

    $gest = User::create(['tenant_id' => $this->tenant->id, 'name' => 'Gest', 'phone' => '+212600000001', 'role' => 'gestionnaire', 'status' => 'active']);
    $this->residence = Residence::withoutGlobalScope('tenant')->create([
        'tenant_id' => $this->tenant->id, 'gestionnaire_id' => $gest->id, 'name' => 'Aqualina',
        'address' => 'X', 'city' => 'Casa', 'total_tantieme' => 1000, 'nb_lots' => 1, 'status' => 'active', 'mode_cotisation' => 'tantieme',
    ]);
    $imm = Immeuble::withoutGlobalScope('tenant')->create(['tenant_id' => $this->tenant->id, 'residence_id' => $this->residence->id, 'nom' => 'A', 'nb_etages' => 1, 'nb_lots' => 1]);
    $lot = Lot::withoutGlobalScope('tenant')->create(['tenant_id' => $this->tenant->id, 'residence_id' => $this->residence->id, 'immeuble_id' => $imm->id, 'numero' => 'A1', 'type' => 'appartement', 'etage' => 2, 'tantieme' => 1000]);

    $this->resident = User::create(['tenant_id' => $this->tenant->id, 'name' => 'Hassan', 'phone' => '+212611111111', 'role' => 'resident', 'status' => 'active', 'password' => bcrypt('x')]);
    $this->resident->assignRole('resident');
    Coproprietaire::create(['tenant_id' => $this->tenant->id, 'user_id' => $this->resident->id, 'lot_id' => $lot->id, 'type' => 'proprietaire', 'solde_actuel' => 0]);

    $this->annonce = Annonce::create([
        'tenant_id' => $this->tenant->id, 'residence_id' => $this->residence->id, 'created_by' => $gest->id,
        'titre' => 'Coupure eau', 'contenu' => 'Demain', 'priorite' => 'urgente', 'statut' => 'publiee', 'publiee_at' => now(),
    ]);

    $this->auth = ['Authorization' => 'Bearer '.$this->resident->createToken('t')->plainTextToken];
});

it('likes an annonce and returns the count + liked state', function () {
    $this->withHeaders($this->auth)
        ->postJson("/api/portail/annonces/{$this->annonce->id}/like", ['liked' => true])
        ->assertStatus(200)
        ->assertJsonPath('status', 'success')
        ->assertJsonPath('data.likes_count', 1)
        ->assertJsonPath('data.liked', true);

    $this->assertDatabaseHas('annonce_likes', [
        'annonce_id' => $this->annonce->id,
        'user_id'    => $this->resident->id,
    ]);
});

it('is idempotent — liking twice keeps one like', function () {
    foreach ([true, true] as $state) {
        $this->withHeaders($this->auth)
            ->postJson("/api/portail/annonces/{$this->annonce->id}/like", ['liked' => $state])
            ->assertStatus(200);
    }

    expect($this->annonce->likes()->count())->toBe(1);
});

it('unlikes an annonce', function () {
    $this->annonce->likes()->create(['user_id' => $this->resident->id]);

    $this->withHeaders($this->auth)
        ->postJson("/api/portail/annonces/{$this->annonce->id}/like", ['liked' => false])
        ->assertStatus(200)
        ->assertJsonPath('data.likes_count', 0)
        ->assertJsonPath('data.liked', false);

    $this->assertDatabaseMissing('annonce_likes', [
        'annonce_id' => $this->annonce->id,
        'user_id'    => $this->resident->id,
    ]);
});

it('exposes likes_count and liked in the annonces list', function () {
    $this->annonce->likes()->create(['user_id' => $this->resident->id]);

    $this->withHeaders($this->auth)
        ->getJson('/api/portail/annonces')
        ->assertStatus(200)
        ->assertJsonPath('data.annonces.0.likes_count', 1)
        ->assertJsonPath('data.annonces.0.liked', true);
});

it('rejects liking an annonce from another tenant (404)', function () {
    $otherTenant = Tenant::create(['name' => 'O', 'email' => 'o@o.ma', 'subdomain' => 'o', 'plan' => 'starter', 'status' => 'active']);
    $otherGest = User::create(['tenant_id' => $otherTenant->id, 'name' => 'OG', 'phone' => '+212699999999', 'role' => 'gestionnaire', 'status' => 'active']);
    $otherAnnonce = Annonce::create([
        'tenant_id' => $otherTenant->id, 'residence_id' => null, 'created_by' => $otherGest->id,
        'titre' => 'X', 'contenu' => 'Y', 'priorite' => 'normale', 'statut' => 'publiee', 'publiee_at' => now(),
    ]);

    $this->withHeaders($this->auth)
        ->postJson("/api/portail/annonces/{$otherAnnonce->id}/like", ['liked' => true])
        ->assertStatus(404);
});

it('requires the liked boolean', function () {
    $this->withHeaders($this->auth)
        ->postJson("/api/portail/annonces/{$this->annonce->id}/like", [])
        ->assertStatus(422)
        ->assertJsonValidationErrors('liked');
});
