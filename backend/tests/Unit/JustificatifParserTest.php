<?php

use App\Services\Ocr\JustificatifParser;

beforeEach(function () {
    $this->parser = new JustificatifParser;
});

it('extrait montant + date + méthode + référence d\'un reçu de virement', function () {
    $texte = "BANQUE POPULAIRE\nReçu de virement\n".
        "Montant : 1 500,00 DH\n".
        "Date du virement : 28/06/2026\n".
        "Type : Virement bancaire\n".
        "Référence : REFWWJ2332\n";

    expect($this->parser->parse($texte))->toBe([
        'montant' => 1500.0,
        'date' => '2026-06-28',
        'methode' => 'virement',
        'reference' => 'REFWWJ2332',
    ]);
});

it('gère un montant sans séparateur et un bordereau', function () {
    $champs = $this->parser->parse("Versement espèces\nMontant 750 MAD\nle 02-05-2026\nBordereau: BRD-00912");

    expect($champs['montant'])->toBe(750.0)
        ->and($champs['date'])->toBe('2026-05-02')
        ->and($champs['methode'])->toBe('versement')
        ->and($champs['reference'])->toBe('BRD-00912');
});

it('normalise les séparateurs milliers/décimales', function () {
    expect($this->parser->parse('Total 12.500,50 DH')['montant'])->toBe(12500.5)
        ->and($this->parser->parse('Total 1,250.00 DH')['montant'])->toBe(1250.0)
        ->and($this->parser->parse('Montant: 3000 DHS')['montant'])->toBe(3000.0);
});

it('détecte chèque et espèces', function () {
    expect($this->parser->parse('Paiement par chèque n° 4455')['methode'])->toBe('cheque')
        ->and($this->parser->parse('Règlement en espèces')['methode'])->toBe('especes');
});

it('renvoie des champs null quand rien n\'est reconnaissable', function () {
    expect($this->parser->parse('texte illisible sans données'))->toBe([
        'montant' => null,
        'date' => null,
        'methode' => null,
        'reference' => null,
    ]);
});
