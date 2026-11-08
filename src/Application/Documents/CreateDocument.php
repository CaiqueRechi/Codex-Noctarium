<?php

declare(strict_types=1);

namespace CrowVaultCanvas\Application\Documents;

use CrowVaultCanvas\Application\Contexts\RequireAvailableContext;
use CrowVaultCanvas\Domain\Knowledge\Models\KnowledgeContext;
use CrowVaultCanvas\Domain\Knowledge\Models\KnowledgeEntity;
use CrowVaultCanvas\Domain\Knowledge\Models\MarkdownDocument;
use CrowVaultCanvas\Domain\Knowledge\Models\Vault;
use CrowVaultCanvas\Infrastructure\Storage\MarkdownStorage;
use CrowVaultCanvas\Jobs\IndexKnowledgeEntity;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

final readonly class CreateDocument
{
    public function __construct(
        private MarkdownStorage $storage,
        private OpenDocument $openDocument,
        private RequireAvailableContext $requireAvailableContext,
    ) {}

    public function handle(string $contextId): OpenedDocument
    {
        $entity = DB::transaction(function () use ($contextId): KnowledgeEntity {
            $vaultId = (string) config('crow-vault-canvas.vault.id');
            Vault::query()->whereKey($vaultId)->lockForUpdate()->firstOrFail();
            $context = KnowledgeContext::query()
                ->whereKey($contextId)
                ->where('vault_id', (string) config('crow-vault-canvas.vault.id'))
                ->lockForUpdate()
                ->firstOrFail();
            $this->requireAvailableContext->handle($context);
            $entityId = (string) Str::uuid();
            $entity = KnowledgeEntity::query()->create([
                'id' => $entityId,
                'vault_id' => $context->vault_id,
                'kind' => KnowledgeEntity::KIND_DOCUMENT,
                'title' => null,
            ]);
            $stored = $this->storage->writeRevision(
                $context->vault_id,
                $entityId,
                1,
                '',
            );

            MarkdownDocument::query()->create([
                'entity_id' => $entityId,
                'storage_path' => $stored->path,
                'revision' => 1,
                'content_hash' => $stored->contentHash,
                'current_revision_id' => $stored->revisionId,
            ]);
            $context->entities()->attach($entityId);

            return $entity;
        }, 3);

        IndexKnowledgeEntity::dispatchTracked((string) $entity->getKey());

        return $this->openDocument->handle($entity->getKey());
    }
}
