<?php

/*
|--------------------------------------------------------------------------
| Catalogue des plans d'abonnement (back-office Digitoyou)
|--------------------------------------------------------------------------
|
| Limites de ressources par plan, utilisées par le back-office pour afficher
| la consommation (jauges « 18/20 lots ») et détecter les dépassements.
| Une limite à `null` = illimité. Les libellés servent l'affichage front.
|
| NB : ce n'est PAS un système de facturation — juste le socle de quotas.
| La facturation réelle (MRR, factures, CMI) est une phase ultérieure.
|
*/

return [

    // Ordre d'affichage / de montée en gamme (upsell).
    'order' => ['starter', 'growth', 'pro', 'business', 'large', 'enterprise'],

    'catalog' => [
        'starter' => [
            'label' => 'Starter',
            'limits' => ['residences' => 2, 'lots' => 100, 'users' => 3, 'storage_mb' => 1024],
        ],
        'growth' => [
            'label' => 'Growth',
            'limits' => ['residences' => 5, 'lots' => 300, 'users' => 8, 'storage_mb' => 5120],
        ],
        'pro' => [
            'label' => 'Pro',
            'limits' => ['residences' => 15, 'lots' => 1000, 'users' => 20, 'storage_mb' => 15360],
        ],
        'business' => [
            'label' => 'Business',
            'limits' => ['residences' => 40, 'lots' => 3000, 'users' => 50, 'storage_mb' => 51200],
        ],
        'large' => [
            'label' => 'Large',
            'limits' => ['residences' => 100, 'lots' => 10000, 'users' => 150, 'storage_mb' => 153600],
        ],
        'enterprise' => [
            'label' => 'Enterprise',
            'limits' => ['residences' => null, 'lots' => null, 'users' => null, 'storage_mb' => null],
        ],
    ],

    // Seuil (%) à partir duquel une ressource est signalée « proche de la limite ».
    'warn_threshold' => 80,
];
