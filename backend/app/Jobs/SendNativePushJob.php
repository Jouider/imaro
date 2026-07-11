<?php

namespace App\Jobs;

use App\Models\User;
use App\Services\NativePushService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Spatie\Multitenancy\Jobs\NotTenantAware;

/**
 * Envoi async d'un push natif à un utilisateur (KAN-68).
 * NotTenantAware : tout est résolu par id, pas besoin du tenant courant Spatie.
 *
 * @param  array<string,string>  $data
 */
class SendNativePushJob implements NotTenantAware, ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public function __construct(
        public int $userId,
        public string $title,
        public string $body,
        public array $data = [],
    ) {}

    public function handle(NativePushService $push): void
    {
        $user = User::find($this->userId);
        if ($user) {
            $push->sendToUser($user, $this->title, $this->body, $this->data);
        }
    }
}
