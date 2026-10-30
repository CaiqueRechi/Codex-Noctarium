<?php

declare(strict_types=1);

return [
    'enabled' => filter_var(env('CVC_ENABLED', false), FILTER_VALIDATE_BOOL),
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
