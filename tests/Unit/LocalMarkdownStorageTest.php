<?php

declare(strict_types=1);

namespace CrowVaultCanvas\Tests\Unit;

use CrowVaultCanvas\Infrastructure\Storage\LocalMarkdownStorage;
use CrowVaultCanvas\Tests\TestCase;
use InvalidArgumentException;

final class LocalMarkdownStorageTest extends TestCase
{
    public function test_it_confines_reads_to_the_expected_vault_and_entity(): void
    {
        $storage = new LocalMarkdownStorage;
        $vaultId = '019a34a8-0c7e-71ec-88ca-c4fb55740101';
        $entityId = '019a34a8-0c7e-71ec-88ca-c4fb55740202';

        $this->expectException(InvalidArgumentException::class);

        $storage->read($vaultId, $entityId, '../../outside.md');
    }

    public function test_it_rejects_untrusted_identifiers_before_touching_the_filesystem(): void
    {
        $storage = new LocalMarkdownStorage;

        $this->expectException(InvalidArgumentException::class);

        $storage->writeRevision('../vault', '019a34a8-0c7e-71ec-88ca-c4fb55740202', 1, 'content');
    }
}
