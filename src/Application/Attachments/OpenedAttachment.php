<?php

declare(strict_types=1);

namespace CrowVaultCanvas\Application\Attachments;

final readonly class OpenedAttachment
{
    /** @param resource $stream */
    public function __construct(
        public string $originalName,
        public string $mimeType,
        public int $sizeBytes,
        public mixed $stream,
    ) {}
}
