<?php

declare(strict_types=1);

namespace CrowVaultCanvas\Tests\Feature;

use CrowVaultCanvas\Tests\TestCase;

final class PackageDisabledTest extends TestCase
{
    protected function defineEnvironment($app): void
    {
        $app['config']->set('crow-vault-canvas.enabled', false);
    }

    public function test_rf_14_does_not_register_routes_when_the_feature_is_disabled(): void
    {
        self::assertFalse($this->app['router']->has('cvc.vault'));
    }
}
