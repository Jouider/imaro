<?php

use App\Providers\AppServiceProvider;
use App\Providers\HorizonServiceProvider;

$providers = [
    AppServiceProvider::class,
    HorizonServiceProvider::class,
    App\Providers\NotificationServiceProvider::class,
];

if (class_exists(\Laravel\Telescope\TelescopeApplicationServiceProvider::class)) {
    $providers[] = App\Providers\TelescopeServiceProvider::class;
}

return $providers;
