<?php

declare(strict_types=1);

namespace CrowVaultCanvas\Application\Documents;

use CrowVaultCanvas\Application\Attachments\AttachmentSummary;
use CrowVaultCanvas\Domain\Knowledge\Models\KnowledgeEntity;
use CrowVaultCanvas\Infrastructure\Storage\MarkdownStorage;
use RuntimeException;

final readonly class OpenDocument
{
    public function __construct(private MarkdownStorage $storage) {}

    public function handle(string $entityId): OpenedDocument
    {
        $entity = KnowledgeEntity::query()
            ->whereKey($entityId)
            ->where('vault_id', (string) config('crow-vault-canvas.vault.id'))
            ->where('kind', KnowledgeEntity::KIND_DOCUMENT)
            ->with(['document', 'attachments', 'noteSpace'])
            ->firstOrFail();
        $document = $entity->document;

        if ($document === null) {
            throw new RuntimeException('The document metadata is unavailable.');
        }

        $content = $this->storage->read(
            $entity->vault_id,
            $entity->getKey(),
            $document->storage_path,
        );

        if (! hash_equals($document->content_hash, hash('sha256', $content))) {
            throw new RuntimeException('The Markdown revision failed its integrity check.');
        }

        return new OpenedDocument(
            $entity->getKey(),
            $entity->title,
            $content,
            $document->revision,
            $entity->entity_type,
            $entity->properties ?? [],
            array_values($entity->tags ?? []),
            $entity->attachments
                ->map(fn ($attachment): array => AttachmentSummary::fromModel($attachment)->toArray())
                ->values()
                ->all(),
            $entity->noteSpace?->context_id,
        );
    }
}
