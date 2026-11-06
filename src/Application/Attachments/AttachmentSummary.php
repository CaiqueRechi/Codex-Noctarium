<?php

declare(strict_types=1);

namespace CrowVaultCanvas\Application\Attachments;

use CrowVaultCanvas\Domain\Knowledge\Models\Attachment;

final readonly class AttachmentSummary
{
    public function __construct(
        public string $id,
        public string $name,
        public string $mimeType,
        public int $sizeBytes,
    ) {}

    public static function fromModel(Attachment $attachment): self
    {
        return new self(
            (string) $attachment->getKey(),
            $attachment->original_name,
            $attachment->mime_type,
            $attachment->size_bytes,
        );
    }

    /** @return array{id: string, name: string, mimeType: string, sizeBytes: int} */
    public function toArray(): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'mimeType' => $this->mimeType,
            'sizeBytes' => $this->sizeBytes,
        ];
    }
}
