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
        'max_markdown_bytes' => (int) env('CVC_MAX_MARKDOWN_BYTES', 2 * 1024 * 1024),
        'max_vault_bytes' => (int) env('CVC_MAX_VAULT_BYTES', 1024 * 1024 * 1024),
        'max_vault_entries' => (int) env('CVC_MAX_VAULT_ENTRIES', 10_000),
        'minimum_free_bytes' => (int) env('CVC_MINIMUM_FREE_BYTES', 100 * 1024 * 1024),
    ],
    'operations' => [
        'history_limit' => env('CVC_OPERATION_HISTORY_LIMIT', 20),
        'stale_after_seconds' => env('CVC_OPERATION_STALE_AFTER_SECONDS', 300),
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
        'context_write_middleware' => [
            'throttle:30,1',
        ],
        'relation_write_middleware' => [
            'throttle:60,1',
        ],
        'layout_write_middleware' => [
            'throttle:120,1',
        ],
        'perspective_write_middleware' => [
            'throttle:30,1',
        ],
        'version_write_middleware' => [
            'throttle:10,1',
        ],
        'search_middleware' => [
            'throttle:60,1',
        ],
        'operations_middleware' => [
            'throttle:60,1',
        ],
        'trash_write_middleware' => [
            'throttle:30,1',
        ],
        'attachment_write_middleware' => [
            'throttle:10,1',
        ],
        'workspace_write_middleware' => [
            'throttle:120,1',
        ],
    ],
];
