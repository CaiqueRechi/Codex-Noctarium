<?php

declare(strict_types=1);

namespace CrowVaultCanvas\Application\Contexts;

use CrowVaultCanvas\Application\Documents\CreateMarkdownEntity;
use CrowVaultCanvas\Application\Documents\OpenDocument;
use CrowVaultCanvas\Application\Documents\OpenedDocument;
use CrowVaultCanvas\Domain\Knowledge\Models\KnowledgeContext;
use CrowVaultCanvas\Domain\Knowledge\Models\KnowledgeEntity;
use CrowVaultCanvas\Domain\Knowledge\Models\NoteSpace;
use CrowVaultCanvas\Domain\Knowledge\Models\Vault;
use CrowVaultCanvas\Jobs\IndexKnowledgeEntity;
use Illuminate\Contracts\Config\Repository;
use Illuminate\Database\DatabaseManager;

final readonly class EnsureContextDocument
{
    public function __construct(
        private CreateMarkdownEntity $createMarkdownEntity,
        private OpenDocument $openDocument,
        private RequireAvailableContext $requireAvailableContext,
        private DatabaseManager $database,
        private Repository $config,
    ) {}

    public function handle(string $contextId): OpenedDocument
    {
        $entity = $this->database->transaction(function () use ($contextId): KnowledgeEntity {
            $vaultId = (string) $this->config->get('crow-vault-canvas.vault.id');
            Vault::query()->whereKey($vaultId)->lockForUpdate()->firstOrFail();
            $context = KnowledgeContext::query()->where('vault_id', $vaultId)
                ->whereKey($contextId)->lockForUpdate()->firstOrFail();
            $this->requireAvailableContext->handle($context);
            $link = NoteSpace::query()->where('context_id', $contextId)->first();

            if ($link !== null) {
                return KnowledgeEntity::query()->where('vault_id', $vaultId)
                    ->where('kind', KnowledgeEntity::KIND_DOCUMENT)->whereHas('document')
                    ->whereKey($link->entity_id)->firstOrFail();
            }

            $entity = $this->createMarkdownEntity->handle($context->name);
            NoteSpace::query()->create(['entity_id' => $entity->getKey(), 'context_id' => $contextId]);

            return $entity;
        }, 3);

        if ($entity->wasRecentlyCreated) {
            IndexKnowledgeEntity::dispatchTracked((string) $entity->getKey());
        }

        return $this->openDocument->handle((string) $entity->getKey());
    }
}
