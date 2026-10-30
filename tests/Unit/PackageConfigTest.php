<?php

declare(strict_types=1);

namespace CrowVaultCanvas\Tests\Unit;

use PHPUnit\Framework\TestCase;

final class PackageConfigTest extends TestCase
{
    public function test_rf_14_normalizes_a_string_feature_flag(): void
    {
        $environmentValue = $_ENV['CVC_ENABLED'] ?? null;
        $serverValue = $_SERVER['CVC_ENABLED'] ?? null;

        $_ENV['CVC_ENABLED'] = 'true';
        $_SERVER['CVC_ENABLED'] = 'true';

        try {
            $config = require dirname(__DIR__, 2).'/config/crow-vault-canvas.php';

            self::assertTrue($config['enabled']);
        } finally {
            $this->restoreEnvironmentValue('CVC_ENABLED', $environmentValue, $_ENV);
            $this->restoreEnvironmentValue('CVC_ENABLED', $serverValue, $_SERVER);
        }
    }

    /** @param array<string, mixed> $environment */
    private function restoreEnvironmentValue(string $key, mixed $value, array &$environment): void
    {
        if ($value === null) {
            unset($environment[$key]);

            return;
        }

        $environment[$key] = $value;
    }
}
