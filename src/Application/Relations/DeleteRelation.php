<?php

declare(strict_types=1);

namespace CrowVaultCanvas\Application\Relations;

use CrowVaultCanvas\Domain\Knowledge\Models\KnowledgeRelation;

final class DeleteRelation
{
    public function handle(string $relationId): void
    {
        KnowledgeRelation::query()
            ->whereKey($relationId)
            ->where('vault_id', (string) config('crow-vault-canvas.vault.id'))
            ->firstOrFail()
            ->delete();
    }
}
