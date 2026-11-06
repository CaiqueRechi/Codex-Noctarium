<?php

declare(strict_types=1);

namespace CrowVaultCanvas\Application\Versions;

use CrowVaultCanvas\Domain\Knowledge\Models\VaultVersion;

final readonly class VersionRestoration
{
    public function __construct(
        public VaultVersion $restoredVersion,
        public VaultVersion $recoveryVersion,
    ) {}
}
