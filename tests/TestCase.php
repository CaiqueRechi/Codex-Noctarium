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
        $app['config']->set('crow-vault-canvas.route.document_write_middleware', []);
        $app['config']->set('crow-vault-canvas.route.workspace_write_middleware', []);
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
