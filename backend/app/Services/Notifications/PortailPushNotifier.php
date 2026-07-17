<?php

namespace App\Services\Notifications;

use App\Jobs\SendNativePushJob;
use App\Models\Annonce;
use App\Models\Coproprietaire;
use App\Models\Lot;
use App\Models\Notification;
use App\Models\Ticket;
use App\Models\Visite;
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
            $this->persist($annonce->tenant_id, $userId, 'info', $titre, $corps, ['annonce_id' => $annonce->id]);
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

        $this->persist($copro->tenant_id, $copro->user_id, 'paiement', 'Rappel de paiement', $corps);
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

    /** Paiement déclaré validé par le syndic → le résident émetteur. */
    public function paiementValide(Coproprietaire $copro, ?string $reference = null): void
    {
        if (! $copro->user_id) {
            return;
        }

        $corps = $reference
            ? 'Votre paiement '.$reference.' a été validé. Reçu disponible.'
            : 'Votre paiement a été validé. Reçu disponible.';

        $this->persist($copro->tenant_id, $copro->user_id, 'paiement', 'Paiement validé', $corps, $reference ? ['reference' => $reference] : []);
        SendNativePushJob::dispatch($copro->user_id, 'Paiement validé', $corps, ['route' => '/portail/finances']);
    }

    /**
     * Visiteur arrivé (check-in / walk-in) → notifie l'hôte, le copropriétaire
     * concerné (KAN-135). L'hôte est résolu via host_user_id, sinon via le
     * copropriétaire principal du lot hôte. Best-effort : silencieux si aucun
     * compte résident n'est rattaché.
     */
    public function visiteurArrive(Visite $visite): void
    {
        $hostUserId = $visite->host_user_id
            ?? $visite->hostLot?->coproprietairePrincipal?->user_id;

        if (! $hostUserId) {
            return;
        }

        $qui = match ($visite->type) {
            'delivery' => 'Une livraison',
            'contractor', 'prestataire' => 'Un prestataire',
            default => 'Un visiteur',
        };

        $nom = $visite->visitor_name ? ' ('.$visite->visitor_name.')' : '';
        $corps = $qui.$nom." vient d'arriver à l'accueil de votre résidence.";

        SendNativePushJob::dispatch($hostUserId, 'Visiteur à l’accueil', $corps, [
            'route' => '/portail',
        ]);
    }

    /**
     * Persiste une notification in-app (centre de notifications) en plus du push
     * natif (KAN-133). Le push est best-effort et no-op sans provider FCM/APNs
     * configuré (#316) ; la notification in-app, elle, s'affiche toujours dans le
     * portail. Les événements ticket/paiement rejeté sont déjà persistés par leurs
     * contrôleurs — on ne double pas ici.
     */
    private function persist(int $tenantId, int $userId, string $type, string $title, string $body, array $data = []): void
    {
        Notification::create([
            'tenant_id' => $tenantId,
            'user_id' => $userId,
            'type' => $type,
            'title' => $title,
            'message' => $body,
            'read' => false,
            'data' => $data,
        ]);
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
