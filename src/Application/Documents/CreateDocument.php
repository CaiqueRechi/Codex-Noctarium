<?php

declare(strict_types=1);

namespace CrowVaultCanvas\Application\Documents;

use CrowVaultCanvas\Application\Contexts\RequireAvailableContext;
use CrowVaultCanvas\Domain\Knowledge\Models\KnowledgeContext;
use CrowVaultCanvas\Domain\Knowledge\Models\KnowledgeEntity;
use CrowVaultCanvas\Domain\Knowledge\Models\Vault;
use CrowVaultCanvas\Jobs\IndexKnowledgeEntity;
use Illuminate\Support\Facades\DB;

final readonly class CreateDocument
{
    public function __construct(
        private CreateMarkdownEntity $createMarkdownEntity,
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
            $entity = $this->createMarkdownEntity->handle();
            $context->entities()->attach($entity->getKey());

            return $entity;
        }, 3);

        IndexKnowledgeEntity::dispatchTracked((string) $entity->getKey());

        return $this->openDocument->handle($entity->getKey());
    }
}
