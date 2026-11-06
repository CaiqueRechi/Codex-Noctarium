<?php

declare(strict_types=1);

namespace CrowVaultCanvas\Application\Attachments;

final readonly class InspectedAttachment
{
    public function __construct(
        public string $originalName,
        public string $extension,
        public string $mimeType,
        public int $sizeBytes,
        public string $contentHash,
    ) {}
}
