<?php

declare(strict_types=1);

namespace CrowVaultCanvas\Application\Documents;

use CrowVaultCanvas\Domain\Knowledge\Models\KnowledgeEntity;
use CrowVaultCanvas\Domain\Knowledge\Models\MarkdownDocument;
use CrowVaultCanvas\Infrastructure\Storage\MarkdownStorage;
use CrowVaultCanvas\Jobs\IndexKnowledgeEntity;
use Illuminate\Support\Facades\DB;

final readonly class SaveDocument
{
    public function __construct(
        private MarkdownStorage $storage,
        private OpenDocument $openDocument,
    ) {}

    public function handle(string $entityId, string $content, int $expectedRevision): OpenedDocument
    {
        DB::transaction(function () use ($entityId, $content, $expectedRevision): void {
            $entity = KnowledgeEntity::query()
                ->whereKey($entityId)
                ->where('vault_id', (string) config('crow-vault-canvas.vault.id'))
                ->where('kind', KnowledgeEntity::KIND_DOCUMENT)
                ->lockForUpdate()
                ->firstOrFail();
            $document = MarkdownDocument::query()
                ->whereKey($entity->getKey())
                ->lockForUpdate()
                ->firstOrFail();

            if ($document->revision !== $expectedRevision) {
                throw new DocumentRevisionConflict('The document changed after it was opened.');
            }

            $revision = $document->revision + 1;
            $stored = $this->storage->writeRevision(
                $entity->vault_id,
                $entity->getKey(),
                $revision,
                $content,
            );

            $document->update([
                'storage_path' => $stored->path,
                'revision' => $revision,
                'content_hash' => $stored->contentHash,
            ]);
            $entity->advanceSearchVersion();
        }, 3);

        IndexKnowledgeEntity::dispatch($entityId)->afterCommit();

        return $this->openDocument->handle($entityId);
    }
}
