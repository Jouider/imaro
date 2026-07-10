<?php

namespace App\Http\Controllers\Api\Gestionnaire\Concerns;

use App\Models\Exercice;

/**
 * Empêche tout mouvement (dépense, appel de fonds, encaissement) sur un
 * exercice clôturé (KAN-127 / Décret 2.23.700 — intangibilité des comptes clos).
 */
trait GuardsClosedExercice
{
    protected function abortIfExerciceCloture(?int $exerciceId): void
    {
        if ($exerciceId && Exercice::whereKey($exerciceId)->where('statut', 'cloture')->exists()) {
            abort(422, 'Exercice clôturé : aucun mouvement n\'est autorisé.');
        }
    }
}
