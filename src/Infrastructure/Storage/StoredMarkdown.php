<?php

declare(strict_types=1);

namespace CrowVaultCanvas\Infrastructure\Storage;

final readonly class StoredMarkdown
{
    public function __construct(
        public string $path,
        public string $contentHash,
    ) {}
}
