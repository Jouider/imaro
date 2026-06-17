<?php

namespace App\Services\Payment;

use App\Models\PaymentSession;

/**
 * Contrat d'une passerelle de paiement (KAN-72 / #251).
 *
 * Implémentation à venir selon le choix : PayDunya (REST/token) ou CMI
 * (redirection bancaire + 3DS). Le driver est lié au conteneur uniquement
 * lorsqu'une passerelle est configurée (services.payment.gateway) — sinon
 * l'endpoint /paiement/initier renvoie 422 « paiement en ligne non disponible ».
 */
interface PaymentGateway
{
    /**
     * Crée une session côté passerelle et renvoie l'URL de redirection
     * vers laquelle ouvrir le navigateur in-app.
     */
    public function createSession(PaymentSession $session): string;
}
