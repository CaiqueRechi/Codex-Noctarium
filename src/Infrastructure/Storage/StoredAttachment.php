<?php

declare(strict_types=1);

namespace CrowVaultCanvas\Infrastructure\Storage;

final readonly class StoredAttachment
{
    public function __construct(public string $path) {}
}
