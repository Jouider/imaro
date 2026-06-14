<?php

namespace App\Jobs;

use App\Models\AssistanceRequest;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;
use Resend;
use Spatie\Multitenancy\Jobs\NotTenantAware;
use Throwable;

/**
 * Email interne à l'équipe IT pour une demande d'assistance recouvrement (#179).
 * Réutilise le SDK Resend (comme les notifications). NotTenantAware : email vers
 * une boîte fixe, pas de tenant courant requis.
 */
class SendAssistanceRecouvrementEmailJob implements NotTenantAware, ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public function __construct(public int $requestId) {}

    public function handle(): void
    {
        $req = AssistanceRequest::find($this->requestId);
        if (! $req) {
            return;
        }

        $to = config('services.assistance_recouvrement.inbox', 'recouvrement@imaro.ma');
        $from = config('notifications.providers.resend.fallback_from', 'no-reply@imaro.ma');
        $apiKey = config('notifications.providers.resend.api_key');

        $plans = ['essentiel' => 'Essentiel', 'complet' => 'Complet', 'sur_mesure' => 'Sur mesure'];
        $planLabel = $plans[$req->plan] ?? $req->plan;
        $subject = "Assistance recouvrement — {$req->reference} ({$planLabel})";

        $body = implode("\n", [
            "Nouvelle demande d'assistance recouvrement.",
            '',
            "Référence : {$req->reference}",
            'Plan : '.$planLabel,
            '',
            "Syndic : {$req->syndic_name}",
            "Contact : {$req->contact_name}",
            "Téléphone : {$req->contact_phone}",
            "Email : {$req->contact_email}",
            'Résidences : '.($req->residences_count ?: '—'),
            'Impayés estimés : '.($req->impayes_estimate ?: '—'),
            '',
            'Message :',
            $req->message ?: '—',
        ]);

        // Sans clé API (dev/CI) : on journalise au lieu d'envoyer.
        if (! $apiKey) {
            Log::info('[ASSISTANCE RECOUVREMENT — email simulé]', ['to' => $to, 'subject' => $subject, 'body' => $body]);

            return;
        }

        try {
            Resend::client($apiKey)->emails->send([
                'from' => $from,
                'to' => [$to],
                'reply_to' => $req->contact_email,
                'subject' => $subject,
                'html' => nl2br(e($body)),
            ]);
        } catch (Throwable $e) {
            Log::error('[ASSISTANCE RECOUVREMENT — échec email]', ['reference' => $req->reference, 'error' => $e->getMessage()]);
        }
    }
}
