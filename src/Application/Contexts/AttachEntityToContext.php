<?php

declare(strict_types=1);

namespace CrowVaultCanvas\Application\Contexts;

use CrowVaultCanvas\Domain\Knowledge\Models\KnowledgeContext;
use CrowVaultCanvas\Domain\Knowledge\Models\KnowledgeEntity;
use CrowVaultCanvas\Jobs\IndexKnowledgeEntity;
use Illuminate\Support\Facades\DB;

final class AttachEntityToContext
{
    public function handle(string $contextId, string $entityId): void
    {
        DB::transaction(function () use ($contextId, $entityId): void {
            $vaultId = (string) config('crow-vault-canvas.vault.id');
            $context = KnowledgeContext::query()
                ->whereKey($contextId)
                ->where('vault_id', $vaultId)
                ->where('kind', KnowledgeContext::KIND_CONTEXT)
                ->lockForUpdate()
                ->firstOrFail();
            $entity = KnowledgeEntity::query()
                ->whereKey($entityId)
                ->where('vault_id', $vaultId)
                ->lockForUpdate()
                ->firstOrFail();

            $context->entities()->syncWithoutDetaching([$entityId]);
            $entity->advanceSearchVersion();
        }, 3);

        IndexKnowledgeEntity::dispatchTracked($entityId);
    }
}
