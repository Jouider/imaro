<?php

use App\Models\Tenant;
use App\Models\User;
use App\Services\Ocr\OcrEngine;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Spatie\Permission\Models\Role;

uses(RefreshDatabase::class);

beforeEach(function () {
    Role::firstOrCreate(['name' => 'resident', 'guard_name' => 'web']);

    $this->tenant = Tenant::create(['name' => 'T', 'email' => 't@t.ma', 'subdomain' => 't', 'plan' => 'business', 'status' => 'active']);
    config(['app.tenant_id' => $this->tenant->id]);
    $this->resident = User::create(['tenant_id' => $this->tenant->id, 'name' => 'Hassan', 'phone' => '+212611111111', 'role' => 'resident', 'status' => 'active', 'password' => bcrypt('x')]);
    $this->resident->assignRole('resident');
    $this->auth = ['Authorization' => 'Bearer '.$this->resident->createToken('t')->plainTextToken];
});

/** Remplace le moteur OCR par un faux qui renvoie un texte fixe (pas de binaire en test). */
function fakeOcr(string $texte): void
{
    app()->bind(OcrEngine::class, fn () => new class($texte) implements OcrEngine
    {
        public function __construct(private string $t) {}

        public function text(string $imagePath): string
        {
            return $this->t;
        }
    });
}

it('OCR d\'un justificatif → champs préremplis (ocr_ok)', function () {
    fakeOcr("Reçu de virement\nMontant : 1 500,00 DH\nDate : 28/06/2026\nVirement bancaire\nRéférence : REFWWJ2332");

    $this->withHeaders($this->auth)->post('/api/portail/paiements/ocr', [
        'justificatif' => UploadedFile::fake()->image('recu.jpg'),
    ])->assertStatus(200)
        ->assertJsonPath('data.ocr_ok', true)
        ->assertJsonPath('data.champs.montant', 1500)
        ->assertJsonPath('data.champs.date', '2026-06-28')
        ->assertJsonPath('data.champs.methode', 'virement')
        ->assertJsonPath('data.champs.reference', 'REFWWJ2332');
});

it('OCR illisible → ocr_ok=false + champs vides (saisie manuelle)', function () {
    fakeOcr('blabla sans rien');

    $this->withHeaders($this->auth)->post('/api/portail/paiements/ocr', [
        'justificatif' => UploadedFile::fake()->image('flou.jpg'),
    ])->assertStatus(200)
        ->assertJsonPath('data.ocr_ok', false)
        ->assertJsonPath('data.champs.montant', null)
        ->assertJsonPath('data.champs.reference', null);
});

it('moteur OCR en panne → 200 dégradé (jamais bloquant)', function () {
    app()->bind(OcrEngine::class, fn () => new class implements OcrEngine
    {
        public function text(string $imagePath): string
        {
            throw new RuntimeException('tesseract introuvable');
        }
    });

    $this->withHeaders($this->auth)->post('/api/portail/paiements/ocr', [
        'justificatif' => UploadedFile::fake()->image('recu.jpg'),
    ])->assertStatus(200)->assertJsonPath('data.ocr_ok', false);
});

it('refuse un type de fichier non autorisé (422)', function () {
    $this->withHeaders($this->auth)->postJson('/api/portail/paiements/ocr', [
        'justificatif' => UploadedFile::fake()->create('doc.txt', 10, 'text/plain'),
    ])->assertStatus(422)->assertJsonValidationErrors(['justificatif']);
});
