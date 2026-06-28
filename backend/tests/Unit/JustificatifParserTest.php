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

it('ne prend PAS un numéro de compte (« Compte N° ») pour une référence', function () {
    // Reçus Banque Populaire réels : "Compte N°: 2121180762910008".
    $champs = $this->parser->parse("Virement de: 1000 MAD\nCompte N°: 2121180762910008\nDate d'execution: 21/04/2026");

    expect($champs['montant'])->toBe(1000.0)
        ->and($champs['date'])->toBe('2026-04-21')
        ->and($champs['methode'])->toBe('virement')
        ->and($champs['reference'])->toBeNull(); // surtout pas 2121180762910008
});

it('lit les reçus bancaires marocains réels (montant en DHS/MAD)', function () {
    // Saham Bank : "Montant du virement : 1500.00 DHS" + comptes émetteur/bénéficiaire.
    $saham = $this->parser->parse(
        "Montant du virement : 1500.00 DHS\nemis le 14/06/2026\n".
        "N° de compte de l'emetteur : 022780000260002821891674\n".
        "N° de compte du beneficiaire : 190780212118076291000836\nMotif : cotisation"
    );
    expect($saham['montant'])->toBe(1500.0)
        ->and($saham['date'])->toBe('2026-06-14')
        ->and($saham['reference'])->toBeNull(); // aucune réf sur ce reçu

    // CDM : "Montant 1,500.00 MAD".
    expect($this->parser->parse('VIREMENT Montant 1,500.00 MAD Date d execution 21/04/2026')['montant'])
        ->toBe(1500.0);
});

it('renvoie des champs null quand rien n\'est reconnaissable', function () {
    expect($this->parser->parse('texte illisible sans données'))->toBe([
        'montant' => null,
        'date' => null,
        'methode' => null,
        'reference' => null,
    ]);
});
