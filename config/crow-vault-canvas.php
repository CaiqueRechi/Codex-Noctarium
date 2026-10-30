<?php

declare(strict_types=1);

return [
    'enabled' => env('CVC_ENABLED', false),
    'route' => [
        'prefix' => 'vault',
        'name' => 'cvc.',
        'middleware' => [
            'web',
            'auth',
            'verified',
            'screen.access:vault,read',
        ],
    ],
];
