<?php

declare(strict_types=1);

namespace CrowVaultCanvas\Tests;

use CrowVaultCanvas\CrowVaultCanvasServiceProvider;
use Orchestra\Testbench\TestCase as Orchestra;

abstract class TestCase extends Orchestra
{
    /** @return array<class-string> */
    protected function getPackageProviders($app): array
    {
        return [CrowVaultCanvasServiceProvider::class];
    }
}
