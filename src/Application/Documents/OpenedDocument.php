<?php

declare(strict_types=1);

namespace CrowVaultCanvas\Application\Documents;

final readonly class OpenedDocument
{
    public function __construct(
        public string $id,
        public ?string $title,
        public string $content,
        public int $revision,
        public ?string $entityType,
        /** @var array<string, bool|float|int|string|null> */
        public array $properties,
        /** @var list<string> */
        public array $tags,
        /** @var list<array{id: string, name: string, mimeType: string, sizeBytes: int}> */
        public array $attachments,
        public ?string $spaceId = null,
    ) {}

    /** @return array{id: string, title: string|null, content: string, revision: int, entityType: string|null, properties: object, tags: list<string>, attachments: list<array{id: string, name: string, mimeType: string, sizeBytes: int}>, spaceId: string|null} */
    public function toArray(): array
    {
        return [
            'id' => $this->id,
            'title' => $this->title,
            'content' => $this->content,
            'revision' => $this->revision,
            'entityType' => $this->entityType,
            'properties' => (object) $this->properties,
            'tags' => $this->tags,
            'attachments' => $this->attachments,
            'spaceId' => $this->spaceId,
        ];
    }
}
