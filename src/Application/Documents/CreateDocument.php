<?php

declare(strict_types=1);

namespace CrowVaultCanvas\Application\Documents;

use CrowVaultCanvas\Domain\Knowledge\Models\KnowledgeContext;
use CrowVaultCanvas\Domain\Knowledge\Models\KnowledgeEntity;
use CrowVaultCanvas\Domain\Knowledge\Models\MarkdownDocument;
use CrowVaultCanvas\Infrastructure\Storage\MarkdownStorage;
use CrowVaultCanvas\Jobs\IndexKnowledgeEntity;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

final readonly class CreateDocument
{
    public function __construct(
        private MarkdownStorage $storage,
        private OpenDocument $openDocument,
    ) {}

    public function handle(string $contextId): OpenedDocument
    {
        $entity = DB::transaction(function () use ($contextId): KnowledgeEntity {
            $context = KnowledgeContext::query()
                ->whereKey($contextId)
                ->where('vault_id', (string) config('crow-vault-canvas.vault.id'))
                ->lockForUpdate()
                ->firstOrFail();
            $entityId = (string) Str::uuid();
            $stored = $this->storage->writeRevision(
                $context->vault_id,
                $entityId,
                1,
                '',
            );
            $entity = KnowledgeEntity::query()->create([
                'id' => $entityId,
                'vault_id' => $context->vault_id,
                'kind' => KnowledgeEntity::KIND_DOCUMENT,
                'title' => null,
            ]);

            MarkdownDocument::query()->create([
                'entity_id' => $entityId,
                'storage_path' => $stored->path,
                'revision' => 1,
                'content_hash' => $stored->contentHash,
            ]);
            $context->entities()->attach($entityId);

            return $entity;
        }, 3);

        IndexKnowledgeEntity::dispatchTracked((string) $entity->getKey());

        return $this->openDocument->handle($entity->getKey());
    }
}
