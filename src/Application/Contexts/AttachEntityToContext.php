<?php

declare(strict_types=1);

namespace CrowVaultCanvas\Application\Contexts;

use CrowVaultCanvas\Domain\Knowledge\Models\KnowledgeContext;
use CrowVaultCanvas\Domain\Knowledge\Models\KnowledgeEntity;
use CrowVaultCanvas\Domain\Knowledge\Models\Vault;
use CrowVaultCanvas\Jobs\IndexKnowledgeEntity;
use Illuminate\Support\Facades\DB;

final class AttachEntityToContext
{
    public function __construct(
        private readonly NoteSpaceHierarchy $hierarchy,
        private readonly RequireAvailableContext $requireAvailableContext,
    ) {}

    public function handle(string $contextId, string $entityId): void
    {
        DB::transaction(function () use ($contextId, $entityId): void {
            $vaultId = (string) config('crow-vault-canvas.vault.id');
            Vault::query()->whereKey($vaultId)->lockForUpdate()->firstOrFail();
            $context = KnowledgeContext::query()
                ->whereKey($contextId)
                ->where('vault_id', $vaultId)
                ->lockForUpdate()
                ->firstOrFail();
            $this->requireAvailableContext->handle($context);
            $entity = KnowledgeEntity::query()
                ->whereKey($entityId)
                ->where('vault_id', $vaultId)
                ->lockForUpdate()
                ->firstOrFail();

            $this->hierarchy->assertCanAttach($contextId, $entityId);
            $context->entities()->syncWithoutDetaching([$entityId]);
            $entity->advanceSearchVersion();
        }, 3);

        IndexKnowledgeEntity::dispatchTracked($entityId);
    }
}
