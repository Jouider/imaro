<?php

namespace App\Jobs;

use App\Models\Lot;
use App\Models\Paiement;
use App\Models\Residence;
use App\Models\Tenant;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Storage;
use Spatie\Multitenancy\Jobs\NotTenantAware;

/**
 * Génère (async) le reçu PDF d'un paiement et stocke son chemin dans recu_pdf_path.
 * Le portail résident expose ensuite recu_url à partir de ce chemin.
 *
 * NotTenantAware : le job résout tout par identifiants (withoutGlobalScope) et n'a
 * pas besoin du tenant courant Spatie — sinon le worker lève
 * CurrentTenantCouldNotBeDeterminedInTenantAwareJob (queues tenant-aware par défaut).
 */
class GenerateRecuPaiementJob implements NotTenantAware, ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public function __construct(public int $paiementId) {}

    public function handle(): void
    {
        $paiement = Paiement::with(['coproprietaire.user'])->find($this->paiementId);
        if (! $paiement) {
            return;
        }

        $copro = $paiement->coproprietaire;
        $lot = $copro?->lot_id ? Lot::withoutGlobalScope('tenant')->find($copro->lot_id) : null;
        $residence = $lot ? Residence::withoutGlobalScope('tenant')->find($lot->residence_id) : null;
        $tenant = Tenant::find($paiement->tenant_id);

        $html = view('pdf.recu_paiement', [
            'paiement' => $paiement,
            'copro' => $copro,
            'lot' => $lot,
            'residence' => $residence,
            'tenant' => $tenant,
        ])->render();

        $path = "recus/recu-paiement-{$paiement->id}.pdf";
        Storage::disk('public')->put($path, Pdf::loadHTML($html)->setPaper('a4')->output());

        $paiement->update(['recu_pdf_path' => $path]);
    }
}
