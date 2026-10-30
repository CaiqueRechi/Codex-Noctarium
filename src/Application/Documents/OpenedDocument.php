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
    ) {}

    /** @return array{id: string, title: string|null, content: string, revision: int} */
    public function toArray(): array
    {
        return [
            'id' => $this->id,
            'title' => $this->title,
            'content' => $this->content,
            'revision' => $this->revision,
        ];
    }
}
