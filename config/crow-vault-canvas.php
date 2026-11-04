<?php

declare(strict_types=1);

return [
    'enabled' => filter_var(env('CVC_ENABLED', false), FILTER_VALIDATE_BOOL),
    'vault' => [
        'id' => env('CVC_VAULT_ID', '019a34a8-0c7e-71ec-88ca-c4fb55740101'),
        'name' => env('CVC_VAULT_NAME', 'Crow Vault Canvas'),
        'initial_universe' => env('CVC_INITIAL_UNIVERSE', 'Meu Universo'),
        'initial_context' => env('CVC_INITIAL_CONTEXT', 'Primeiro Contexto'),
    ],
    'storage' => [
        'root' => env('CVC_STORAGE_ROOT', storage_path('app/private/cvc')),
    ],
    'route' => [
        'prefix' => 'vault',
        'name' => 'cvc.',
        'middleware' => [
            'web',
            'auth',
            'verified',
            'screen.access:vault,read',
        ],
        'write_middleware' => [
            'screen.access:vault,write',
        ],
        'document_write_middleware' => [
            'throttle:30,1',
        ],
        'entity_write_middleware' => [
            'throttle:60,1',
        ],
        'workspace_write_middleware' => [
            'throttle:120,1',
        ],
    ],
];
