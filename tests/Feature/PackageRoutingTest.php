<?php

declare(strict_types=1);

namespace CrowVaultCanvas\Tests\Feature;

use CrowVaultCanvas\Tests\TestCase;

final class PackageRoutingTest extends TestCase
{
    public function test_rf_14_registers_the_vault_route_when_the_feature_is_enabled(): void
    {
        self::assertTrue($this->app['router']->has('cvc.vault'));
        self::assertSame('/vault', route('cvc.vault', absolute: false));
    }
}
