<?php

declare(strict_types=1);

namespace CrowVaultCanvas\Tests\Feature;

use CrowVaultCanvas\CrowVaultCanvasServiceProvider;
use CrowVaultCanvas\Tests\TestCase;

final class PackageBootTest extends TestCase
{
    public function test_package_provider_boots(): void
    {
        self::assertTrue($this->app->providerIsLoaded(CrowVaultCanvasServiceProvider::class));
    }
}
