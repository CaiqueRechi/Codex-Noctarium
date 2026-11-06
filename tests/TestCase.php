<?php

declare(strict_types=1);

namespace CrowVaultCanvas\Tests;

use CrowVaultCanvas\CrowVaultCanvasServiceProvider;
use Orchestra\Testbench\TestCase as Orchestra;

abstract class TestCase extends Orchestra
{
    protected function defineEnvironment($app): void
    {
        $app['config']->set('app.key', '00000000000000000000000000000000');
        $app['config']->set('crow-vault-canvas.enabled', true);
        $app['config']->set('crow-vault-canvas.route.middleware', ['web']);
        $app['config']->set('crow-vault-canvas.route.write_middleware', []);
        $app['config']->set('crow-vault-canvas.route.context_write_middleware', []);
        $app['config']->set('crow-vault-canvas.route.document_write_middleware', []);
        $app['config']->set('crow-vault-canvas.route.workspace_write_middleware', []);
        $app['config']->set('crow-vault-canvas.route.perspective_write_middleware', []);
        $app['config']->set('crow-vault-canvas.route.version_write_middleware', []);
        $app['config']->set('crow-vault-canvas.route.search_middleware', []);
        $app['config']->set('crow-vault-canvas.route.operations_middleware', []);
        $app['config']->set('crow-vault-canvas.route.trash_write_middleware', []);
        $app['config']->set('crow-vault-canvas.route.attachment_write_middleware', []);
        $app['config']->set(
            'crow-vault-canvas.storage.root',
            storage_path('framework/testing/cvc-private'),
        );
    }

    /** @return array<class-string> */
    protected function getPackageProviders($app): array
    {
        return [CrowVaultCanvasServiceProvider::class];
    }
}
