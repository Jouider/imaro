<?php

namespace App\Jobs;

use App\Models\Assemblee;
use App\Models\Convocation;
use App\Models\Lot;
use App\Models\Residence;
use App\Models\Tenant;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Storage;
use Spatie\Multitenancy\Jobs\NotTenantAware;

/**
 * Génère (async) les convocations AG : une par copropriétaire + un PDF fusionné
 * « Imprimer tout ». KAN-98 / #269. NotTenantAware : résolution par id.
 */
class GenerateConvocationsJob implements NotTenantAware, ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public function __construct(public int $assembleeId) {}

    public function handle(): void
    {
        // Si un Job précédent pour la même assemblée tourne encore (redelivery
        // Horizon après un restart pendant un déploiement, double-clic frontend
        // avant le guard du contrôleur…), on ne relance pas une génération
        // concurrente : les deux boucleraient sur les mêmes lots → doublons.
        $lock = Cache::lock("convocations-gen-{$this->assembleeId}", 600);
        if (! $lock->get()) {
            return;
        }

        try {
            $this->generate();
        } finally {
            $lock->release();
        }
    }

    private function generate(): void
    {
        $assemblee = Assemblee::find($this->assembleeId);
        if (! $assemblee) {
            return;
        }

        $residence = Residence::withoutGlobalScope('tenant')->find($assemblee->residence_id);
        $tenant = Tenant::find($assemblee->tenant_id);

        // Copropriétaires (principal de chaque lot de la résidence).
        $lots = Lot::withoutGlobalScope('tenant')
            ->where('residence_id', $assemblee->residence_id)
            ->with('coproprietairePrincipal.user')
            ->get();

        // Purge d'une éventuelle génération précédente.
        Storage::disk('public')->deleteDirectory("convocations/{$assemblee->id}");
        Convocation::where('assemblee_id', $assemblee->id)->delete();

        $ctx = ['assemblee' => $assemblee, 'residence' => $residence, 'tenant' => $tenant];
        $items = [];

        foreach ($lots as $lot) {
            $copro = $lot->coproprietairePrincipal;
            $item = [
                'nom' => $copro?->user?->name ?? 'Non assigné',
                'lot' => $lot->numero,
                'tantieme' => (int) $lot->tantieme,
            ];

            // PDF individuel (une seule convocation par doc).
            $convocation = Convocation::create([
                'tenant_id' => $assemblee->tenant_id,
                'assemblee_id' => $assemblee->id,
                'coproprietaire_id' => $copro?->id,
                'coproprietaire_nom' => $item['nom'],
                'lot_numero' => $item['lot'],
                'tantieme' => $item['tantieme'],
                'pdf_path' => '',
            ]);

            $path = "convocations/{$assemblee->id}/conv-{$convocation->id}.pdf";
            $html = view('pdf.convocation_ag', $ctx + ['convocations' => [$item]])->render();
            Storage::disk('public')->put($path, Pdf::loadHTML($html)->setPaper('a4')->output());
            $convocation->update(['pdf_path' => $path]);

            $items[] = $item;
        }

        // PDF fusionné « Imprimer tout » (toutes les convocations, saut de page entre chaque).
        $mergedPath = "convocations/{$assemblee->id}/merged.pdf";
        $mergedHtml = view('pdf.convocation_ag', $ctx + ['convocations' => $items])->render();
        Storage::disk('public')->put($mergedPath, Pdf::loadHTML($mergedHtml)->setPaper('a4')->output());

        $assemblee->update([
            'convocations_status' => 'ready',
            'convocations_merged_path' => $mergedPath,
            'convocations_generated_at' => now(),
        ]);
    }
}
