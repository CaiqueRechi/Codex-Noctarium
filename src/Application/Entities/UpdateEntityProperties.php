<?php

declare(strict_types=1);

namespace CrowVaultCanvas\Application\Entities;

use CrowVaultCanvas\Domain\Knowledge\Models\KnowledgeEntity;
use Illuminate\Support\Facades\DB;

final class UpdateEntityProperties
{
    /** @param array<string, bool|float|int|string|null> $properties */
    public function handle(
        string $entityId,
        ?string $entityType,
        array $properties,
    ): KnowledgeEntity {
        return DB::transaction(function () use ($entityId, $entityType, $properties): KnowledgeEntity {
            $entity = KnowledgeEntity::query()
                ->whereKey($entityId)
                ->where('vault_id', (string) config('crow-vault-canvas.vault.id'))
                ->lockForUpdate()
                ->firstOrFail();

            $entity->update([
                'entity_type' => $entityType,
                'properties' => $properties,
            ]);

            return $entity->load('document');
        }, 3);
    }
}
