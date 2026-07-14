<?php

namespace App\Services\Visites;

use App\Models\Residence;
use App\Models\User;
use App\Models\Visite;
use App\Models\VisiteScanLog;
use App\Services\Notifications\PortailPushNotifier;
use Illuminate\Support\Carbon;

/**
 * Logique métier des visites (création + cycle de scan check-in/out).
 * Cf. docs/feature-visites-backend-brief.md.
 */
class VisiteService
{
    /** Fenêtre de tolérance autour de planned_at pour autoriser le check-in. */
    private const WINDOW_HOURS = 2;

    public function __construct(private readonly PortailPushNotifier $push) {}

    public function eagerLoad(): array
    {
        return ['hostLot.coproprietairePrincipal.user', 'hostUser', 'createdBy'];
    }

    /**
     * Crée une visite. Sans planned_at → walk-in (arrivée immédiate).
     * Avec planned_at → planifiée.
     */
    public function create(Residence $residence, array $data, ?User $createdBy, ?int $hostUserId = null): Visite
    {
        $walkIn = empty($data['planned_at']);

        $visite = Visite::create([
            'tenant_id' => $residence->tenant_id,
            'residence_id' => $residence->id,
            'qr_token' => Visite::generateToken(),
            'visitor_name' => $data['visitor_name'],
            'visitor_phone' => $data['visitor_phone'] ?? null,
            'type' => $data['type'] ?? 'visitor',
            'purpose' => $data['purpose'] ?? null,
            'host_lot_id' => $data['host_lot_id'] ?? null,
            'host_user_id' => $hostUserId,
            'planned_at' => $walkIn ? null : $data['planned_at'],
            'arrived_at' => $walkIn ? now() : null,
            'status' => $walkIn ? 'arrived' : 'planned',
            'is_recurring' => (bool) ($data['is_recurring'] ?? false),
            'recurrence' => $data['recurrence'] ?? null,
            'created_by_id' => $createdBy?->id,
        ]);

        // Walk-in = arrivée immédiate → prévenir l'hôte (KAN-135).
        if ($walkIn) {
            $this->push->visiteurArrive($visite);
        }

        return $visite;
    }

    /**
     * Applique le cycle de scan et journalise. Retourne
     * ['action' => check_in|check_out|rejected, 'reason' => ?string].
     */
    public function scan(Visite $visite, ?User $scannedBy): array
    {
        [$action, $reason] = $this->resolveScan($visite);

        if ($action === 'check_in') {
            $visite->update(['status' => 'arrived', 'arrived_at' => now(), 'left_at' => null]);
            // Arrivée confirmée → prévenir l'hôte (KAN-135).
            $this->push->visiteurArrive($visite);
        } elseif ($action === 'check_out') {
            $visite->update(['status' => 'departed', 'left_at' => now()]);
        }

        VisiteScanLog::create([
            'tenant_id' => $visite->tenant_id,
            'visite_id' => $visite->id,
            'scanned_by_id' => $scannedBy?->id,
            'action' => $action,
            'reason' => $reason,
            'scanned_at' => now(),
        ]);

        return ['action' => $action, 'reason' => $reason];
    }

    /** @return array{0:string,1:?string} [action, reason] */
    private function resolveScan(Visite $visite): array
    {
        return match ($visite->status) {
            'planned' => $this->resolvePlanned($visite),
            'arrived' => ['check_out', null],
            'departed' => $visite->is_recurring ? ['check_in', null] : ['rejected', 'already_departed'],
            'cancelled' => ['rejected', 'cancelled'],
            'expired' => ['rejected', 'expired'],
            default => ['rejected', 'invalid'],
        };
    }

    private function resolvePlanned(Visite $visite): array
    {
        if (! $visite->planned_at) {
            return ['check_in', null];
        }

        $now = Carbon::now();
        $planned = $visite->planned_at;

        if ($now->lt($planned->copy()->subHours(self::WINDOW_HOURS))) {
            return ['rejected', 'too_early'];
        }
        if ($now->gt($planned->copy()->addHours(self::WINDOW_HOURS)) && ! $visite->is_recurring) {
            return ['rejected', 'expired'];
        }

        return ['check_in', null];
    }
}
