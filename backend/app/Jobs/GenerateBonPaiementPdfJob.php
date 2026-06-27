<?php

namespace App\Jobs;

use App\Models\BonPaiement;
use App\Models\Lot;
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
 * Génère (async) le PDF d'un bon de paiement validé et stocke son chemin dans
 * pdf_path. Le portail résident expose ensuite pdf_url à partir de ce chemin
 * (KAN-110 / #322). NotTenantAware : résolution par identifiants.
 */
class GenerateBonPaiementPdfJob implements NotTenantAware, ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public function __construct(public int $bonId) {}

    public function handle(): void
    {
        $bon = BonPaiement::with(['coproprietaire.user', 'ticket'])->find($this->bonId);
        if (! $bon) {
            return;
        }

        $copro = $bon->coproprietaire;
        $lot = $copro?->lot_id ? Lot::withoutGlobalScope('tenant')->find($copro->lot_id) : null;
        $residence = Residence::withoutGlobalScope('tenant')->find($bon->residence_id);
        $tenant = Tenant::find($bon->tenant_id);

        $html = view('pdf.bon_paiement', [
            'bon' => $bon,
            'copro' => $copro,
            'lot' => $lot,
            'residence' => $residence,
            'tenant' => $tenant,
        ])->render();

        $path = "bons-paiement/bon-{$bon->id}.pdf";
        Storage::disk('public')->put($path, Pdf::loadHTML($html)->setPaper('a4')->output());

        $bon->update(['pdf_path' => $path]);
    }
}
