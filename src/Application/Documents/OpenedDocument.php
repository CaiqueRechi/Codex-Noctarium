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
    ) {}

    /** @return array{id: string, title: string|null, content: string, revision: int, entityType: string|null, properties: object} */
    public function toArray(): array
    {
        return [
            'id' => $this->id,
            'title' => $this->title,
            'content' => $this->content,
            'revision' => $this->revision,
            'entityType' => $this->entityType,
            'properties' => (object) $this->properties,
        ];
    }
}
