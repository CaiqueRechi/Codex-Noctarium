<?php

declare(strict_types=1);

namespace CrowVaultCanvas\Tests;

use CrowVaultCanvas\CrowVaultCanvasServiceProvider;
use Orchestra\Testbench\TestCase as Orchestra;

abstract class TestCase extends Orchestra
{
    protected function defineEnvironment($app): void
    {
        $app['config']->set('crow-vault-canvas.enabled', true);
        $app['config']->set('crow-vault-canvas.route.middleware', ['web']);
    }

    /** @return array<class-string> */
    protected function getPackageProviders($app): array
    {
        return [CrowVaultCanvasServiceProvider::class];
    }
}
