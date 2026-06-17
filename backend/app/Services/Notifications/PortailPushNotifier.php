<?php

namespace App\Services\Notifications;

use App\Jobs\SendNativePushJob;
use App\Models\Annonce;
use App\Models\Coproprietaire;
use App\Models\Lot;
use App\Models\Ticket;
use Illuminate\Support\Collection;
use Illuminate\Support\Str;

/**
 * Déclenche les push natifs métier du portail résident (KAN-68).
 * Chaque envoi passe par SendNativePushJob (async, best-effort).
 * Les routes de deep-link correspondent à celles gérées par l'app (KAN-67).
 */
class PortailPushNotifier
{
    /** Annonce publiée → résidents de la résidence (ou tout le tenant si globale). */
    public function annoncePubliee(Annonce $annonce): void
    {
        $titre = $annonce->priorite === 'urgente' ? '🔴 '.$annonce->titre : $annonce->titre;
        $corps = Str::limit(trim(strip_tags((string) $annonce->contenu)), 120);

        foreach ($this->residentUserIds($annonce->tenant_id, $annonce->residence_id) as $userId) {
            SendNativePushJob::dispatch($userId, $titre, $corps, ['route' => '/portail']);
        }
    }

    /** Rappel de paiement → le copropriétaire concerné. */
    public function rappelPaiement(Coproprietaire $copro, ?float $montant = null): void
    {
        if (! $copro->user_id) {
            return;
        }

        $corps = $montant !== null
            ? 'Vous avez un solde de '.number_format($montant, 2, ',', ' ').' DH à régler.'
            : 'Vous avez des charges en attente de règlement.';

        SendNativePushJob::dispatch($copro->user_id, 'Rappel de paiement', $corps, ['route' => '/portail/finances']);
    }

    /** Réclamation mise à jour / résolue → l'auteur (résident). */
    public function ticketMisAJour(Ticket $ticket): void
    {
        if (! $ticket->user_id) {
            return;
        }

        $corps = match ($ticket->statut) {
            'resolu', 'clos' => 'Votre réclamation a été traitée. Donnez votre avis 🙂',
            'en_cours' => 'Votre réclamation est en cours de traitement.',
            default => 'Votre réclamation a été mise à jour.',
        };

        SendNativePushJob::dispatch($ticket->user_id, 'Suivi de votre réclamation', $corps, ['route' => '/portail/reclamations']);
    }

    /** IDs des utilisateurs résidents (copropriétaires liés à un compte). */
    private function residentUserIds(int $tenantId, ?int $residenceId): Collection
    {
        return Coproprietaire::where('tenant_id', $tenantId)
            ->whereNotNull('user_id')
            ->when($residenceId, fn ($q) => $q->whereIn(
                'lot_id',
                Lot::where('residence_id', $residenceId)->pluck('id'),
            ))
            ->pluck('user_id')
            ->unique()
            ->values();
    }
}
