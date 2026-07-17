<?php

use App\Models\Annonce;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Spatie\Permission\Models\Role;

uses(RefreshDatabase::class);

beforeEach(function () {
    Role::firstOrCreate(['name' => 'manager', 'guard_name' => 'web']);
    Storage::fake('public');

    $this->tenant = Tenant::create(['name' => 'T', 'email' => 't@t.ma', 'subdomain' => 't', 'plan' => 'business', 'status' => 'active']);
    config(['app.tenant_id' => $this->tenant->id]);
    $this->manager = User::create(['tenant_id' => $this->tenant->id, 'name' => 'Mgr', 'phone' => '+212600000001', 'role' => 'manager', 'status' => 'active']);
    $this->manager->assignRole('manager');
    $this->auth = ['Authorization' => 'Bearer '.$this->manager->createToken('t')->plainTextToken];
});

it('crée une annonce avec photo + vidéo (médias persistés et stockés)', function () {
    $res = $this->withHeaders($this->auth)->post('/api/gestionnaire/annonces', [
        'titre' => 'Travaux',
        'contenu' => 'Voir la vidéo',
        'media' => [
            UploadedFile::fake()->image('photo.jpg'),
            UploadedFile::fake()->create('clip.mp4', 2048, 'video/mp4'), // 2 Mo
        ],
    ])->assertStatus(201)
        ->assertJsonCount(2, 'data.annonce.media')
        ->assertJsonPath('data.annonce.media.0.type', 'image')
        ->assertJsonPath('data.annonce.media.1.type', 'video');

    $media = Annonce::first()->media;
    expect($media)->toHaveCount(2);
    foreach ($media as $m) {
        Storage::disk('public')->assertExists($m['path']);
    }
});

it('refuse une vidéo de plus de 30 Mo (422)', function () {
    $this->withHeaders($this->auth)->post('/api/gestionnaire/annonces', [
        'titre' => 'X', 'contenu' => 'Y',
        'media' => [UploadedFile::fake()->create('big.mp4', 31000, 'video/mp4')], // ~30,3 Mo
    ])->assertStatus(422)->assertJsonValidationErrors(['media.0']);
});

it('accepte un .mp4 réel dont finfo détecte un variant (M4V) au lieu de video/mp4 strict', function () {
    // Régression KAN-96 : certaines vraies vidéos mp4 (brand "M4V " côté conteneur,
    // export iOS/itunes courant) sont sniffées par finfo comme video/x-m4v, pas
    // video/mp4 — la règle mimetypes stricte les rejetait en 422 à tort.
    $path = tempnam(sys_get_temp_dir(), 'm4v').'.mp4';
    $ftypM4v = hex2bin('0000001c667479704d345620000002004d3456202020');
    file_put_contents($path, $ftypM4v.str_repeat("\0", 2000));
    $file = new UploadedFile($path, 'clip.mp4', null, null, true);

    $this->withHeaders($this->auth)->post('/api/gestionnaire/annonces', [
        'titre' => 'X', 'contenu' => 'Y',
        'media' => [$file],
    ])->assertStatus(201)->assertJsonPath('data.annonce.media.0.type', 'video');

    unlink($path);
});

it('refuse un type de fichier non autorisé (422)', function () {
    $this->withHeaders($this->auth)->post('/api/gestionnaire/annonces', [
        'titre' => 'X', 'contenu' => 'Y',
        'media' => [UploadedFile::fake()->create('doc.pdf', 100, 'application/pdf')],
    ])->assertStatus(422);
});

it('renvoie 422 (et non 500) si media contient une valeur non-fichier', function () {
    // Régression : un élément media non-fichier faisait planter la closure de
    // validation (getMimeType() on array → 500). Doit renvoyer un 422 propre.
    $this->withHeaders($this->auth)->postJson('/api/gestionnaire/annonces', [
        'titre' => 'X', 'contenu' => 'Y',
        'media' => ['pas-un-fichier'],
    ])->assertStatus(422)->assertJsonValidationErrors(['media.0']);
});

it('supprime les fichiers média à la suppression de l\'annonce', function () {
    $this->withHeaders($this->auth)->post('/api/gestionnaire/annonces', [
        'titre' => 'A', 'contenu' => 'B',
        'media' => [UploadedFile::fake()->image('p.jpg')],
    ])->assertStatus(201);

    $annonce = Annonce::first();
    $path = $annonce->media[0]['path'];
    Storage::disk('public')->assertExists($path);

    $this->withHeaders($this->auth)->deleteJson("/api/gestionnaire/annonces/{$annonce->id}")->assertStatus(200);
    Storage::disk('public')->assertMissing($path);
});
