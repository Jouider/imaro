<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Throwable;
use Twilio\Rest\Client as TwilioClient;
use Twilio\Rest\Content\V1\AuthenticationAction;
use Twilio\Rest\Content\V1\Content\ContentApprovalRequest;
use Twilio\Rest\Content\V1\ContentCreateRequest;
use Twilio\Rest\Content\V1\Types;
use Twilio\Rest\Content\V1\WhatsappAuthentication;

/**
 * Creates + submits a WhatsApp AUTHENTICATION template (one-time access code)
 * to Meta via the Twilio Content API. Authentication templates have a Meta
 * preset body + a mandatory Copy-Code button; the single variable {{1}} is the
 * code. Reproducible alternative to running this by hand in tinker.
 *
 *   php artisan imaro:wa-auth-template
 *   → outputs the HX Content SID to put in WA_TPL_ACCES_COPRO
 */
class CreateWaAuthTemplate extends Command
{
    protected $signature = 'imaro:wa-auth-template
                            {--name=imaro_acces_copro : Template friendly name}
                            {--lang=fr : Template language code}
                            {--expiry=10 : Code expiration in minutes}
                            {--button=Copier le code : Copy-code button label}';

    protected $description = 'Create + submit the WhatsApp AUTHENTICATION template (access code) to Meta via Twilio Content API';

    public function handle(): int
    {
        $sid = config('notifications.providers.twilio_whatsapp.sid');
        $token = config('notifications.providers.twilio_whatsapp.token');

        if (! $sid || ! $token) {
            $this->error('TWILIO_SID / TWILIO_TOKEN manquants dans la config.');

            return self::FAILURE;
        }

        $name = (string) $this->option('name');
        $lang = (string) $this->option('lang');
        $expiry = (string) $this->option('expiry');
        $button = (string) $this->option('button');

        $client = new TwilioClient($sid, $token);

        $auth = new WhatsappAuthentication([
            'add_security_recommendation' => true,
            'code_expiration_minutes' => $expiry,
            'actions' => [
                new AuthenticationAction([
                    'type' => 'COPY_CODE',
                    'copy_code_text' => $button,
                ]),
            ],
        ]);

        $request = new ContentCreateRequest([
            'friendly_name' => $name,
            'language' => $lang,
            'variables' => ['1' => '123456'],
            'types' => new Types(['whatsapp/authentication' => $auth]),
        ]);

        try {
            $content = $client->content->v1->contents->create($request);

            $client->content->v1->contents($content->sid)
                ->approvalCreate
                ->create(new ContentApprovalRequest([
                    'name' => $name,
                    'category' => 'AUTHENTICATION',
                ]));
        } catch (Throwable $e) {
            $this->error('Échec création/soumission Meta : '.$e->getMessage());

            return self::FAILURE;
        }

        $this->info("✅ Template '{$name}' créé et soumis à Meta (catégorie AUTHENTICATION).");
        $this->line("   Content SID : {$content->sid}");
        $this->newLine();
        $this->warn("→ Ajoute au .env :  WA_TPL_ACCES_COPRO={$content->sid}");
        $this->warn('→ Puis :            php artisan config:cache');
        $this->line('→ Vérifie le statut d\'approbation Meta avant usage (contentAndApprovals → approved).');

        return self::SUCCESS;
    }
}
