<?php

/*
|--------------------------------------------------------------------------
| Feature flags (backend)
|--------------------------------------------------------------------------
|
| Interrupteurs de fonctionnalités, pilotés par variables d'environnement.
| Pendant du `frontend/src/lib/features.ts` côté client.
|
*/

return [

    // KAN-111 — surfaces IA désactivées temporairement (coût au démarrage).
    // Réactivable sans déploiement via FEATURE_IA=true.
    // Couvre : assistant EMARO, suggestions budget IA, import IA de factures.
    'ia' => (bool) env('FEATURE_IA', false),

];
